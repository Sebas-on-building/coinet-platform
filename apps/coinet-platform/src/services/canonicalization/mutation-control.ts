/**
 * L3.6 — Mutation Control
 *
 * The only legal entry point for applying canonical mutations.
 * No module may write canonical state directly. All canonical
 * state mutation goes through this orchestrator.
 *
 * Lifecycle: PROPOSED → VALIDATED → STAGED → COMMITTED → REVERSIBLE → SUPERSEDED
 */

import { v4 as uuidv4 } from 'uuid';
import {
  appendMutationRecord,
  generateMutationId,
  markMutationValidated,
  markMutationStaged,
  markMutationCommitted,
  markMutationReversible,
  markMutationSuperseded,
  getMutationById,
  isMutationTransitionLegal,
  type CanonicalMutationType,
  type MutationLifecycleState,
  type CanonicalMutationRecord,
  L36_MUTATION_SCHEMA_VERSION,
  L36_LEDGER_VERSION,
} from './mutation-ledger';
import {
  createCanonicalVersion,
  getCurrentCanonicalVersion,
  getCurrentMetricContractVersion,
  type CanonicalVersionRecord,
  L36_VERSION_SCHEMA_VERSION,
} from './canonical-versioning';
import {
  buildStructuredDiff,
  type DiffSemanticClass,
  type StructuredMutationDiff,
} from './entity-diff-engine';

export const L36_CONTROL_VERSION = '1.0.0' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// PROPOSAL INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface MutationProposalInput {
  mutationType: CanonicalMutationType;
  targetObjectIds: string[];
  targetMetricPaths?: string[];
  targetContractIds?: string[];
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  reasonCodes: string[];
  triggerType: string;
  evidenceRefs: string[];
  validationRefs?: string[];
  approvalRefs?: string[];
  initiatedBy: string;
  semanticClass: DiffSemanticClass;
  lineageRefs?: string[];
  replayCompatibility?: {
    minReplayGeneration?: string;
    maxReplayGeneration?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export type MutationValidationOutcome =
  | 'VALID'
  | 'VALID_WITH_WARNINGS'
  | 'BLOCKED_SCHEMA'
  | 'BLOCKED_EVIDENCE'
  | 'BLOCKED_TRANSITION'
  | 'BLOCKED_REPLAY_COMPATIBILITY'
  | 'BLOCKED_APPROVAL'
  | 'BLOCKED_INVARIANT';

export interface MutationValidationResult {
  mutationId: string;
  outcome: MutationValidationOutcome;
  warnings: string[];
  blockReasons: string[];
  rollbackEligibility: {
    reversible: boolean;
    reason?: string;
  };
  replayCompatibility: {
    minReplayGeneration?: string;
    maxReplayGeneration?: string;
    schemaVersion: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

export interface MutationAuditEvent {
  eventId: string;
  mutationId: string;
  eventType: 'PROPOSED' | 'VALIDATED' | 'STAGED' | 'COMMITTED' | 'SUPERSEDED' | 'ROLLBACK';
  timestamp: string;
  detail: string;
}

const _auditEvents: MutationAuditEvent[] = [];

export function getMutationAuditEvents(): readonly MutationAuditEvent[] {
  return _auditEvents;
}

export function getMutationAuditEventsForMutation(mutationId: string): MutationAuditEvent[] {
  return _auditEvents.filter(e => e.mutationId === mutationId);
}

export function emitMutationAuditEvent(
  mutationId: string,
  eventType: MutationAuditEvent['eventType'],
  detail: string,
): MutationAuditEvent {
  const event: MutationAuditEvent = {
    eventId: `mevt_${uuidv4()}`,
    mutationId,
    eventType,
    timestamp: new Date().toISOString(),
    detail,
  };
  _auditEvents.push(event);
  return event;
}

export function resetAuditEvents(): void {
  _auditEvents.length = 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROPOSE
// ═══════════════════════════════════════════════════════════════════════════════

export interface MutationProposalResult {
  mutationId: string;
  record: CanonicalMutationRecord;
  diff: StructuredMutationDiff;
}

export function proposeMutation(input: MutationProposalInput): MutationProposalResult {
  const mutationId = generateMutationId();

  const diff = buildStructuredDiff(
    mutationId,
    input.targetObjectIds,
    input.beforeState,
    input.afterState,
    input.semanticClass,
  );

  const record: CanonicalMutationRecord = {
    mutationId,
    mutationType: input.mutationType,
    lifecycleState: 'PROPOSED',
    targetObjectIds: input.targetObjectIds,
    targetMetricPaths: input.targetMetricPaths,
    targetContractIds: input.targetContractIds,
    beforeVersionRefs: [],
    afterVersionRefs: [],
    structuredDiffRef: diff.diffId,
    reasonCodes: input.reasonCodes,
    triggerType: input.triggerType,
    evidenceRefs: input.evidenceRefs,
    validationRefs: input.validationRefs ?? [],
    approvalRefs: input.approvalRefs ?? [],
    lineageRefs: input.lineageRefs ?? [],
    replayCompatibility: {
      schemaVersion: L36_MUTATION_SCHEMA_VERSION,
      ...input.replayCompatibility,
    },
    initiatedAt: new Date().toISOString(),
    evaluatorVersion: L36_CONTROL_VERSION,
    policyVersion: L36_LEDGER_VERSION,
    schemaVersion: L36_MUTATION_SCHEMA_VERSION,
    rollbackEligibility: { reversible: true },
    supersedesMutationIds: [],
    supersededByMutationIds: [],
    reviewQueueRefs: [],
  };

  appendMutationRecord(record);
  emitMutationAuditEvent(mutationId, 'PROPOSED', `Proposed ${input.mutationType} on ${input.targetObjectIds.join(',')}`);
  return { mutationId, record, diff };
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATE
// ═══════════════════════════════════════════════════════════════════════════════

export function validateMutation(mutationId: string): MutationValidationResult {
  const rec = getMutationById(mutationId);
  if (!rec) {
    return {
      mutationId, outcome: 'BLOCKED_SCHEMA',
      warnings: [], blockReasons: ['MUTATION_NOT_FOUND'],
      rollbackEligibility: { reversible: false },
      replayCompatibility: { schemaVersion: L36_MUTATION_SCHEMA_VERSION },
    };
  }

  if (!isMutationTransitionLegal(rec.lifecycleState, 'VALIDATED')) {
    return {
      mutationId, outcome: 'BLOCKED_TRANSITION',
      warnings: [], blockReasons: [`ILLEGAL_TRANSITION:${rec.lifecycleState}->VALIDATED`],
      rollbackEligibility: rec.rollbackEligibility,
      replayCompatibility: rec.replayCompatibility,
    };
  }

  const warnings: string[] = [];
  const blockReasons: string[] = [];

  if (rec.reasonCodes.length === 0) {
    blockReasons.push('NO_REASON_CODES');
  }
  if (rec.evidenceRefs.length === 0 && requiresEvidence(rec.mutationType)) {
    blockReasons.push('NO_EVIDENCE_REFS');
  }
  if (rec.targetObjectIds.length === 0 && !isMetricOnlyMutation(rec.mutationType)) {
    blockReasons.push('NO_TARGET_OBJECTS');
  }

  if (blockReasons.length > 0) {
    return {
      mutationId, outcome: 'BLOCKED_EVIDENCE',
      warnings, blockReasons,
      rollbackEligibility: rec.rollbackEligibility,
      replayCompatibility: rec.replayCompatibility,
    };
  }

  const rollbackEligibility = determineRollbackEligibility(rec);
  rec.rollbackEligibility = rollbackEligibility;

  markMutationValidated(mutationId);
  emitMutationAuditEvent(mutationId, 'VALIDATED', 'Mutation validated');

  return {
    mutationId,
    outcome: warnings.length > 0 ? 'VALID_WITH_WARNINGS' : 'VALID',
    warnings, blockReasons: [],
    rollbackEligibility,
    replayCompatibility: rec.replayCompatibility,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE
// ═══════════════════════════════════════════════════════════════════════════════

export function stageMutation(mutationId: string): { staged: boolean; blockReason?: string } {
  const rec = getMutationById(mutationId);
  if (!rec) return { staged: false, blockReason: 'MUTATION_NOT_FOUND' };
  if (!isMutationTransitionLegal(rec.lifecycleState, 'STAGED')) {
    return { staged: false, blockReason: `ILLEGAL_TRANSITION:${rec.lifecycleState}->STAGED` };
  }
  markMutationStaged(mutationId);
  emitMutationAuditEvent(mutationId, 'STAGED', 'Mutation staged');
  return { staged: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMMIT
// ═══════════════════════════════════════════════════════════════════════════════

export interface CommitMutationResult {
  committed: boolean;
  blockReason?: string;
  versionRecord?: CanonicalVersionRecord;
}

export function commitMutation(
  mutationId: string,
  committedBy: string,
  stateSnapshotRef: string,
): CommitMutationResult {
  const rec = getMutationById(mutationId);
  if (!rec) return { committed: false, blockReason: 'MUTATION_NOT_FOUND' };
  if (!isMutationTransitionLegal(rec.lifecycleState, 'COMMITTED')) {
    return { committed: false, blockReason: `ILLEGAL_TRANSITION:${rec.lifecycleState}->COMMITTED` };
  }

  const versionType = isMetricOnlyMutation(rec.mutationType) ? 'METRIC_CONTRACT' as const : 'OBJECT' as const;

  let parentVersionIds = rec.beforeVersionRefs;
  if (parentVersionIds.length === 0) {
    const targetId = versionType === 'OBJECT'
      ? rec.targetObjectIds[0]
      : (rec.targetContractIds?.[0] ?? rec.targetMetricPaths?.[0]);
    if (targetId) {
      const current = versionType === 'OBJECT'
        ? getCurrentCanonicalVersion(targetId)
        : getCurrentMetricContractVersion(targetId);
      if (current) parentVersionIds = [current.versionId];
    }
  }

  const versionRecord = createCanonicalVersion({
    canonicalObjectId: versionType === 'OBJECT' ? rec.targetObjectIds[0] : undefined,
    metricContractId: versionType === 'METRIC_CONTRACT' ? (rec.targetContractIds?.[0] ?? rec.targetMetricPaths?.[0]) : undefined,
    versionType,
    parentVersionIds,
    createdByMutationId: mutationId,
    stateSnapshotRef,
    diffFromParentRef: rec.structuredDiffRef,
    replayCompatibility: {
      minReplayGeneration: rec.replayCompatibility.minReplayGeneration,
      maxReplayGeneration: rec.replayCompatibility.maxReplayGeneration,
    },
  });

  rec.afterVersionRefs.push(versionRecord.versionId);
  markMutationCommitted(mutationId, committedBy);

  if (rec.rollbackEligibility.reversible) {
    markMutationReversible(mutationId);
  }

  emitMutationAuditEvent(mutationId, 'COMMITTED', `Committed by ${committedBy}, version ${versionRecord.versionId}`);
  return { committed: true, versionRecord };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

export interface ApplyMutationResult {
  success: boolean;
  mutationId: string;
  validationResult: MutationValidationResult;
  versionRecord?: CanonicalVersionRecord;
  blockReason?: string;
}

export function applyCanonicalMutation(
  input: MutationProposalInput,
  stateSnapshotRef: string,
): ApplyMutationResult {
  const proposal = proposeMutation(input);
  const validation = validateMutation(proposal.mutationId);

  if (validation.outcome !== 'VALID' && validation.outcome !== 'VALID_WITH_WARNINGS') {
    return {
      success: false, mutationId: proposal.mutationId,
      validationResult: validation,
      blockReason: validation.blockReasons.join(';'),
    };
  }

  const stageResult = stageMutation(proposal.mutationId);
  if (!stageResult.staged) {
    return {
      success: false, mutationId: proposal.mutationId,
      validationResult: validation,
      blockReason: stageResult.blockReason,
    };
  }

  const commitResult = commitMutation(proposal.mutationId, input.initiatedBy, stateSnapshotRef);
  if (!commitResult.committed) {
    return {
      success: false, mutationId: proposal.mutationId,
      validationResult: validation,
      blockReason: commitResult.blockReason,
    };
  }

  return {
    success: true,
    mutationId: proposal.mutationId,
    validationResult: validation,
    versionRecord: commitResult.versionRecord,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPERSEDE
// ═══════════════════════════════════════════════════════════════════════════════

export function supersedeMutation(
  mutationId: string,
  supersededByMutationId: string,
): { superseded: boolean; blockReason?: string } {
  try {
    markMutationSuperseded(mutationId, supersededByMutationId);
    emitMutationAuditEvent(mutationId, 'SUPERSEDED', `Superseded by ${supersededByMutationId}`);
    return { superseded: true };
  } catch (e: unknown) {
    return { superseded: false, blockReason: (e as Error).message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function requiresEvidence(type: CanonicalMutationType): boolean {
  return !isMetricOnlyMutation(type);
}

function isMetricOnlyMutation(type: CanonicalMutationType): boolean {
  return type === 'METRIC_CONTRACT_ADDED' || type === 'METRIC_CONTRACT_REVISED'
    || type === 'METRIC_CONTRACT_DEPRECATED' || type === 'METRIC_PATH_ADDED'
    || type === 'METRIC_PATH_BLOCKED';
}

function determineRollbackEligibility(rec: CanonicalMutationRecord): { reversible: boolean; reason?: string } {
  if (rec.mutationType === 'ENTITY_SPLIT' || rec.mutationType === 'ENTITY_MERGED') {
    return { reversible: true, reason: 'STRUCTURAL_MUTATION_REVERSIBLE_WITH_CORRECTION' };
  }
  if (rec.mutationType === 'METRIC_CONTRACT_DEPRECATED') {
    return { reversible: false, reason: 'DEPRECATION_IS_TERMINAL' };
  }
  return { reversible: true };
}
