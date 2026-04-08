/**
 * L3.6 — Mutation Ledger
 *
 * The immutable, queryable ledger of every canonical mutation event.
 * A mutation is not real because a snapshot changed. A mutation is
 * real because it exists in this ledger.
 *
 * No canonical reality may change in place without a recorded
 * mutation event and preserved prior version.
 */

import { v4 as uuidv4 } from 'uuid';

export const L36_LEDGER_VERSION = '1.0.0' as const;
export const L36_MUTATION_SCHEMA_VERSION = 'v1' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export type CanonicalMutationType =
  | 'ENTITY_CREATED'
  | 'ENTITY_DEPRECATED'
  | 'ENTITY_SPLIT'
  | 'ENTITY_MERGED'
  | 'ALIAS_ADDED'
  | 'ALIAS_REMOVED'
  | 'CONFIDENCE_CHANGED'
  | 'PROVIDER_CLAIM_ADDED'
  | 'PROVIDER_CLAIM_REJECTED'
  | 'PROVIDER_CLAIM_SUPERSEDED'
  | 'WINNING_ANCHOR_CHANGED'
  | 'RECONCILIATION_MODE_CHANGED'
  | 'UNRESOLVED_CONFLICT_ADDED'
  | 'UNRESOLVED_CONFLICT_RESOLVED'
  | 'METRIC_CONTRACT_ADDED'
  | 'METRIC_CONTRACT_REVISED'
  | 'METRIC_CONTRACT_DEPRECATED'
  | 'METRIC_PATH_ADDED'
  | 'METRIC_PATH_BLOCKED'
  | 'CANONICAL_OBJECT_SUPERSEDED'
  | 'ROLLBACK_APPLIED';

export type MutationLifecycleState =
  | 'PROPOSED'
  | 'VALIDATED'
  | 'STAGED'
  | 'COMMITTED'
  | 'REVERSIBLE'
  | 'SUPERSEDED';

// ═══════════════════════════════════════════════════════════════════════════════
// STATE MACHINE
// ═══════════════════════════════════════════════════════════════════════════════

const LEGAL_MUTATION_TRANSITIONS: Record<MutationLifecycleState, MutationLifecycleState[]> = {
  PROPOSED:   ['VALIDATED', 'SUPERSEDED'],
  VALIDATED:  ['STAGED', 'SUPERSEDED'],
  STAGED:     ['COMMITTED', 'SUPERSEDED'],
  COMMITTED:  ['REVERSIBLE', 'SUPERSEDED'],
  REVERSIBLE: ['SUPERSEDED'],
  SUPERSEDED: [],
};

export function isMutationTransitionLegal(
  from: MutationLifecycleState,
  to: MutationLifecycleState,
): boolean {
  return LEGAL_MUTATION_TRANSITIONS[from]?.includes(to) ?? false;
}

export { LEGAL_MUTATION_TRANSITIONS };

// ═══════════════════════════════════════════════════════════════════════════════
// CORE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface ReplayCompatibilityMeta {
  minReplayGeneration?: string;
  maxReplayGeneration?: string;
  schemaVersion: string;
}

export interface RollbackEligibility {
  reversible: boolean;
  reason?: string;
}

export interface CanonicalMutationRecord {
  mutationId: string;
  mutationType: CanonicalMutationType;
  lifecycleState: MutationLifecycleState;
  targetObjectIds: string[];
  targetMetricPaths?: string[];
  targetContractIds?: string[];
  beforeVersionRefs: string[];
  afterVersionRefs: string[];
  structuredDiffRef: string;
  reasonCodes: string[];
  triggerType: string;
  evidenceRefs: string[];
  validationRefs: string[];
  approvalRefs: string[];
  lineageRefs: string[];
  replayCompatibility: ReplayCompatibilityMeta;
  initiatedAt: string;
  committedAt?: string;
  committedBy?: string;
  evaluatorVersion: string;
  policyVersion: string;
  schemaVersion: string;
  rollbackEligibility: RollbackEligibility;
  supersedesMutationIds: string[];
  supersededByMutationIds: string[];
  rollbackOfMutationId?: string;
  rolledBackByMutationId?: string;
  reviewQueueRefs: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════════

const _records: CanonicalMutationRecord[] = [];
const _byId = new Map<string, CanonicalMutationRecord>();
const _byObject = new Map<string, CanonicalMutationRecord[]>();
const _byMetricContract = new Map<string, CanonicalMutationRecord[]>();

function indexRecord(rec: CanonicalMutationRecord): void {
  _byId.set(rec.mutationId, rec);
  for (const oid of rec.targetObjectIds) {
    const list = _byObject.get(oid) ?? [];
    list.push(rec);
    _byObject.set(oid, list);
  }
  for (const cid of rec.targetContractIds ?? []) {
    const list = _byMetricContract.get(cid) ?? [];
    list.push(rec);
    _byMetricContract.set(cid, list);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// APPEND
// ═══════════════════════════════════════════════════════════════════════════════

export function appendMutationRecord(rec: CanonicalMutationRecord): CanonicalMutationRecord {
  if (_byId.has(rec.mutationId)) {
    throw new Error(`L36: duplicate mutation id '${rec.mutationId}'`);
  }
  _records.push(rec);
  indexRecord(rec);
  return rec;
}

export function generateMutationId(): string {
  return `mut_${uuidv4()}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY
// ═══════════════════════════════════════════════════════════════════════════════

export function getMutationById(id: string): CanonicalMutationRecord | undefined {
  return _byId.get(id);
}

export function getMutationsForObject(objectId: string): CanonicalMutationRecord[] {
  return _byObject.get(objectId) ?? [];
}

export function getMutationsForMetricContract(contractId: string): CanonicalMutationRecord[] {
  return _byMetricContract.get(contractId) ?? [];
}

export function getMutationsAtReplayTime(
  objectId: string,
  asOfIso: string,
): CanonicalMutationRecord[] {
  return getMutationsForObject(objectId).filter(
    r => r.initiatedAt <= asOfIso && (r.lifecycleState === 'COMMITTED' || r.lifecycleState === 'REVERSIBLE' || r.lifecycleState === 'SUPERSEDED'),
  );
}

export function getMutationsByType(type: CanonicalMutationType): CanonicalMutationRecord[] {
  return _records.filter(r => r.mutationType === type);
}

export function getAllMutationRecords(): readonly CanonicalMutationRecord[] {
  return _records;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIFECYCLE TRANSITIONS
// ═══════════════════════════════════════════════════════════════════════════════

function transitionMutation(
  mutationId: string,
  toState: MutationLifecycleState,
): CanonicalMutationRecord {
  const rec = _byId.get(mutationId);
  if (!rec) throw new Error(`L36: mutation '${mutationId}' not found`);
  if (!isMutationTransitionLegal(rec.lifecycleState, toState)) {
    throw new Error(`L36: illegal transition ${rec.lifecycleState} -> ${toState} for '${mutationId}'`);
  }
  rec.lifecycleState = toState;
  return rec;
}

export function markMutationValidated(mutationId: string): CanonicalMutationRecord {
  return transitionMutation(mutationId, 'VALIDATED');
}

export function markMutationStaged(mutationId: string): CanonicalMutationRecord {
  return transitionMutation(mutationId, 'STAGED');
}

export function markMutationCommitted(mutationId: string, committedBy?: string): CanonicalMutationRecord {
  const rec = transitionMutation(mutationId, 'COMMITTED');
  rec.committedAt = new Date().toISOString();
  if (committedBy) rec.committedBy = committedBy;
  return rec;
}

export function markMutationReversible(mutationId: string): CanonicalMutationRecord {
  return transitionMutation(mutationId, 'REVERSIBLE');
}

export function markMutationSuperseded(
  mutationId: string,
  supersededByMutationId: string,
): CanonicalMutationRecord {
  const rec = transitionMutation(mutationId, 'SUPERSEDED');
  rec.supersededByMutationIds.push(supersededByMutationId);
  return rec;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROLLBACK LINKAGE
// ═══════════════════════════════════════════════════════════════════════════════

export function linkRollbackMutation(
  originalMutationId: string,
  rollbackMutationId: string,
): void {
  const original = _byId.get(originalMutationId);
  const rollback = _byId.get(rollbackMutationId);
  if (!original) throw new Error(`L36: original mutation '${originalMutationId}' not found`);
  if (!rollback) throw new Error(`L36: rollback mutation '${rollbackMutationId}' not found`);
  original.rolledBackByMutationId = rollbackMutationId;
  rollback.rollbackOfMutationId = originalMutationId;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESET
// ═══════════════════════════════════════════════════════════════════════════════

export function resetMutationLedger(): void {
  _records.length = 0;
  _byId.clear();
  _byObject.clear();
  _byMetricContract.clear();
}
