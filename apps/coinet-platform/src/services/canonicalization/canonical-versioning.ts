/**
 * L3.6 — Canonical Versioning
 *
 * Owns canonical version creation, version chains, and state
 * reconstruction across versions. Every canonical change produces
 * a new version record. Historical reconstruction works by
 * version id or by timestamp.
 *
 * Supports both full state snapshots and structured diff references
 * so replay stays fast while audit-grade mutation detail is preserved.
 */

import { v4 as uuidv4 } from 'uuid';

export const L36_VERSIONING_VERSION = '1.0.0' as const;
export const L36_VERSION_SCHEMA_VERSION = 'v1' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type VersionType =
  | 'OBJECT'
  | 'METRIC_CONTRACT'
  | 'RECONCILIATION_STATE'
  | 'CONFIDENCE_STATE';

export interface CanonicalVersionRecord {
  versionId: string;
  canonicalObjectId?: string;
  metricContractId?: string;
  versionType: VersionType;
  parentVersionIds: string[];
  childVersionIds: string[];
  createdByMutationId: string;
  createdAt: string;
  effectiveFrom: string;
  supersededAt?: string;
  schemaVersion: string;
  stateSnapshotRef: string;
  diffFromParentRef?: string;
  replayCompatibility: {
    minReplayGeneration?: string;
    maxReplayGeneration?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORES
// ═══════════════════════════════════════════════════════════════════════════════

const _versions: CanonicalVersionRecord[] = [];
const _byId = new Map<string, CanonicalVersionRecord>();
const _byObject = new Map<string, CanonicalVersionRecord[]>();
const _byContract = new Map<string, CanonicalVersionRecord[]>();
const _currentByObject = new Map<string, string>();
const _currentByContract = new Map<string, string>();

function indexVersion(v: CanonicalVersionRecord): void {
  _byId.set(v.versionId, v);
  const targetId = v.canonicalObjectId ?? v.metricContractId;
  if (targetId) {
    if (v.versionType === 'METRIC_CONTRACT') {
      const list = _byContract.get(targetId) ?? [];
      list.push(v);
      _byContract.set(targetId, list);
      _currentByContract.set(targetId, v.versionId);
    } else {
      const list = _byObject.get(targetId) ?? [];
      list.push(v);
      _byObject.set(targetId, list);
      _currentByObject.set(targetId, v.versionId);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION CREATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface CreateVersionInput {
  canonicalObjectId?: string;
  metricContractId?: string;
  versionType: VersionType;
  parentVersionIds: string[];
  createdByMutationId: string;
  stateSnapshotRef: string;
  diffFromParentRef?: string;
  effectiveFrom?: string;
  replayCompatibility?: {
    minReplayGeneration?: string;
    maxReplayGeneration?: string;
  };
}

export function createCanonicalVersion(input: CreateVersionInput): CanonicalVersionRecord {
  const now = new Date().toISOString();

  for (const pid of input.parentVersionIds) {
    const parent = _byId.get(pid);
    if (parent && !parent.supersededAt) {
      parent.supersededAt = now;
    }
  }

  const record: CanonicalVersionRecord = {
    versionId: `ver_${uuidv4()}`,
    canonicalObjectId: input.canonicalObjectId,
    metricContractId: input.metricContractId,
    versionType: input.versionType,
    parentVersionIds: input.parentVersionIds,
    childVersionIds: [],
    createdByMutationId: input.createdByMutationId,
    createdAt: now,
    effectiveFrom: input.effectiveFrom ?? now,
    schemaVersion: L36_VERSION_SCHEMA_VERSION,
    stateSnapshotRef: input.stateSnapshotRef,
    diffFromParentRef: input.diffFromParentRef,
    replayCompatibility: input.replayCompatibility ?? {},
  };

  for (const pid of input.parentVersionIds) {
    const parent = _byId.get(pid);
    if (parent) parent.childVersionIds.push(record.versionId);
  }

  _versions.push(record);
  indexVersion(record);
  return record;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════════════════════

export function getCanonicalVersionById(versionId: string): CanonicalVersionRecord | undefined {
  return _byId.get(versionId);
}

export function getCurrentCanonicalVersion(objectId: string): CanonicalVersionRecord | undefined {
  const currentId = _currentByObject.get(objectId);
  return currentId ? _byId.get(currentId) : undefined;
}

export function getCurrentMetricContractVersion(contractId: string): CanonicalVersionRecord | undefined {
  const currentId = _currentByContract.get(contractId);
  return currentId ? _byId.get(currentId) : undefined;
}

export function getCanonicalVersionChain(objectId: string): CanonicalVersionRecord[] {
  return _byObject.get(objectId) ?? [];
}

export function getMetricContractVersionChain(contractId: string): CanonicalVersionRecord[] {
  return _byContract.get(contractId) ?? [];
}

export function reconstructCanonicalStateAtVersion(
  objectId: string,
  versionId: string,
): CanonicalVersionRecord | undefined {
  const chain = _byObject.get(objectId) ?? [];
  return chain.find(v => v.versionId === versionId);
}

export function reconstructCanonicalStateAtTime(
  objectId: string,
  asOfIso: string,
): CanonicalVersionRecord | undefined {
  const chain = _byObject.get(objectId) ?? [];
  const candidates = chain.filter(v => v.effectiveFrom <= asOfIso && !v.supersededAt);
  if (candidates.length > 0) return candidates[candidates.length - 1];
  const allBeforeOrAt = chain.filter(v => v.effectiveFrom <= asOfIso);
  if (allBeforeOrAt.length === 0) return undefined;
  return allBeforeOrAt[allBeforeOrAt.length - 1];
}

export function reconstructMetricContractAtVersion(
  contractId: string,
  versionId: string,
): CanonicalVersionRecord | undefined {
  const chain = _byContract.get(contractId) ?? [];
  return chain.find(v => v.versionId === versionId);
}

export function reconstructMetricContractAtTime(
  contractId: string,
  asOfIso: string,
): CanonicalVersionRecord | undefined {
  const chain = _byContract.get(contractId) ?? [];
  const candidates = chain.filter(v => v.effectiveFrom <= asOfIso);
  if (candidates.length === 0) return undefined;
  return candidates[candidates.length - 1];
}

export function getAllVersionRecords(): readonly CanonicalVersionRecord[] {
  return _versions;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESET
// ═══════════════════════════════════════════════════════════════════════════════

export function resetVersionStore(): void {
  _versions.length = 0;
  _byId.clear();
  _byObject.clear();
  _byContract.clear();
  _currentByObject.clear();
  _currentByContract.clear();
}
