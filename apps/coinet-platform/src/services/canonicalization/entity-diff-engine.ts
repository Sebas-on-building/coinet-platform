/**
 * L3.6 — Entity Diff Engine
 *
 * Computes structured before/after diffs for canonical mutations.
 * Every mutation must be diffable and reviewable. Diffs are
 * machine-readable, human-reviewable, queryable, and replay-compatible.
 */

import { v4 as uuidv4 } from 'uuid';

export const L36_DIFF_VERSION = '1.0.0' as const;
export const L36_DIFF_SCHEMA_VERSION = 'v1' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type DiffSemanticClass =
  | 'STRUCTURAL'
  | 'IDENTITY'
  | 'CONFIDENCE'
  | 'RECONCILIATION'
  | 'METRIC_CONTRACT'
  | 'ALIAS'
  | 'DEPRECATION'
  | 'NO_OP';

export type DiffSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface FieldChange {
  field: string;
  before: unknown;
  after: unknown;
}

export interface StructuredMutationDiff {
  diffId: string;
  mutationId: string;
  targetIds: string[];
  beforeSnapshotRefs: string[];
  afterSnapshotRefs: string[];
  addedFields: string[];
  removedFields: string[];
  changedFields: FieldChange[];
  addedElements: string[];
  removedElements: string[];
  semanticClass: DiffSemanticClass;
  severity: DiffSeverity;
  approvalRequired: boolean;
  rollbackSafe: boolean;
  replayBreaking: boolean;
  createdAt: string;
  schemaVersion: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORE
// ═══════════════════════════════════════════════════════════════════════════════

const _diffs: StructuredMutationDiff[] = [];
const _byId = new Map<string, StructuredMutationDiff>();
const _byMutation = new Map<string, StructuredMutationDiff>();

export function getDiffById(diffId: string): StructuredMutationDiff | undefined {
  return _byId.get(diffId);
}

export function getDiffByMutationId(mutationId: string): StructuredMutationDiff | undefined {
  return _byMutation.get(mutationId);
}

export function getAllDiffs(): readonly StructuredMutationDiff[] {
  return _diffs;
}

export function resetDiffStore(): void {
  _diffs.length = 0;
  _byId.clear();
  _byMutation.clear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE DIFF LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

export function buildStructuredDiff(
  mutationId: string,
  targetIds: string[],
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  semanticClass: DiffSemanticClass,
  beforeSnapshotRefs: string[] = [],
  afterSnapshotRefs: string[] = [],
): StructuredMutationDiff {
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const addedFields: string[] = [];
  const removedFields: string[] = [];
  const changedFields: FieldChange[] = [];
  const addedElements: string[] = [];
  const removedElements: string[] = [];

  for (const key of allKeys) {
    const bVal = before[key];
    const aVal = after[key];

    if (bVal === undefined && aVal !== undefined) {
      addedFields.push(key);
      if (Array.isArray(aVal)) {
        for (const el of aVal) addedElements.push(`${key}:${String(el)}`);
      }
    } else if (bVal !== undefined && aVal === undefined) {
      removedFields.push(key);
      if (Array.isArray(bVal)) {
        for (const el of bVal) removedElements.push(`${key}:${String(el)}`);
      }
    } else if (Array.isArray(bVal) && Array.isArray(aVal)) {
      const bSet = new Set(bVal.map(String));
      const aSet = new Set(aVal.map(String));
      for (const el of aSet) {
        if (!bSet.has(el)) addedElements.push(`${key}:${el}`);
      }
      for (const el of bSet) {
        if (!aSet.has(el)) removedElements.push(`${key}:${el}`);
      }
      if (addedElements.length > 0 || removedElements.length > 0 || !setsEqual(bSet, aSet)) {
        changedFields.push({ field: key, before: bVal, after: aVal });
      }
    } else if (!deepEqual(bVal, aVal)) {
      changedFields.push({ field: key, before: bVal, after: aVal });
    }
  }

  const severity = classifyMutationSeverity(semanticClass, changedFields, addedFields, removedFields);
  const approvalRequired = severity === 'CRITICAL' || severity === 'HIGH';
  const rollbackSafe = semanticClass !== 'STRUCTURAL' || severity !== 'CRITICAL';
  const replayBreaking = semanticClass === 'METRIC_CONTRACT' || semanticClass === 'STRUCTURAL';

  const diff: StructuredMutationDiff = {
    diffId: `diff_${uuidv4()}`,
    mutationId,
    targetIds,
    beforeSnapshotRefs,
    afterSnapshotRefs,
    addedFields,
    removedFields,
    changedFields,
    addedElements,
    removedElements,
    semanticClass,
    severity,
    approvalRequired,
    rollbackSafe,
    replayBreaking,
    createdAt: new Date().toISOString(),
    schemaVersion: L36_DIFF_SCHEMA_VERSION,
  };

  _diffs.push(diff);
  _byId.set(diff.diffId, diff);
  _byMutation.set(mutationId, diff);
  return diff;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPED DIFF HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function diffCanonicalObject(
  mutationId: string,
  objectId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): StructuredMutationDiff {
  const cls = inferObjectDiffClass(before, after);
  return buildStructuredDiff(mutationId, [objectId], before, after, cls, [objectId], [objectId]);
}

export function diffMetricContract(
  mutationId: string,
  contractId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): StructuredMutationDiff {
  return buildStructuredDiff(mutationId, [contractId], before, after, 'METRIC_CONTRACT', [contractId], [contractId]);
}

export function diffReconciliationState(
  mutationId: string,
  objectId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): StructuredMutationDiff {
  return buildStructuredDiff(mutationId, [objectId], before, after, 'RECONCILIATION', [objectId], [objectId]);
}

export function diffConfidenceState(
  mutationId: string,
  objectId: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): StructuredMutationDiff {
  return buildStructuredDiff(mutationId, [objectId], before, after, 'CONFIDENCE', [objectId], [objectId]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SEVERITY CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

export function classifyMutationSeverity(
  semanticClass: DiffSemanticClass,
  changedFields: FieldChange[],
  addedFields: string[],
  removedFields: string[],
): DiffSeverity {
  if (semanticClass === 'STRUCTURAL') return 'CRITICAL';
  if (semanticClass === 'NO_OP') return 'LOW';

  const totalChanges = changedFields.length + addedFields.length + removedFields.length;
  if (totalChanges === 0) return 'LOW';

  if (removedFields.length > 0 && (semanticClass === 'IDENTITY' || semanticClass === 'METRIC_CONTRACT')) return 'HIGH';
  if (semanticClass === 'CONFIDENCE' && changedFields.some(f => f.field === 'band' || f.field === 'rightsProfile')) return 'HIGH';
  if (semanticClass === 'RECONCILIATION' && changedFields.some(f => f.field === 'mode' || f.field === 'winningAnchors')) return 'HIGH';
  if (semanticClass === 'DEPRECATION') return 'MEDIUM';
  if (totalChanges >= 5) return 'MEDIUM';

  return 'LOW';
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNALS
// ═══════════════════════════════════════════════════════════════════════════════

function inferObjectDiffClass(before: Record<string, unknown>, after: Record<string, unknown>): DiffSemanticClass {
  if (before['lifecycleState'] !== after['lifecycleState']) {
    const ls = after['lifecycleState'];
    if (ls === 'DEPRECATED' || ls === 'ARCHIVED') return 'DEPRECATION';
    if (ls === 'MERGED' || ls === 'SPLIT') return 'STRUCTURAL';
    return 'IDENTITY';
  }
  if (before['allowedAliases'] !== after['allowedAliases']) return 'ALIAS';
  if (before['confidenceState'] !== after['confidenceState']) return 'CONFIDENCE';
  return 'IDENTITY';
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || a === undefined || b === undefined) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}
