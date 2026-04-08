/**
 * L3.4 — Entity Merge/Split Engine
 *
 * Owns canonical object structural mutation. Reconciliation discovers
 * whether a split or merge is needed; this engine performs it
 * constitutionally.
 *
 * Merge never deletes parent lineages.
 * Split never destroys parent object history.
 * Ancestry links are mandatory.
 * Mutation history is diffable and reversible.
 * Historical reports remain attached to old versions.
 */

import { v4 as uuidv4 } from 'uuid';
import type { CanonicalObjectType } from './canonical-entity-types';

export const L34_MUTATION_VERSION = '1.0.0' as const;
export const L34_MERGE_SCHEMA_VERSION = 'v1' as const;
export const L34_SPLIT_SCHEMA_VERSION = 'v1' as const;
export const L34_MUTATION_EVENT_SCHEMA_VERSION = 'v1' as const;

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type MutationType = 'MERGE' | 'SPLIT' | 'RECLASSIFY';

export interface AncestryLink {
  parentCanonicalId: string;
  childCanonicalId: string;
  relation: 'MERGED_INTO' | 'SPLIT_FROM' | 'RECLASSIFIED_FROM';
  createdAt: string;
}

export interface MergePlan {
  planId: string;
  schemaVersion: string;
  mergeType: 'MERGE';
  sourceCanonicalIds: string[];
  targetCanonicalId: string;
  objectType: CanonicalObjectType;
  winningAnchorRefs: string[];
  claimPartitionMap: Record<string, string>;
  ancestryLinks: AncestryLink[];
  preservedConflictIds: string[];
  preservedConfidenceHistoryRefs: string[];
  rationale: string;
  createdAt: string;
}

export interface SplitPlan {
  planId: string;
  schemaVersion: string;
  splitType: 'SPLIT';
  sourceCanonicalId: string;
  resultingCanonicalIds: string[];
  objectType: CanonicalObjectType;
  claimPartitionMap: Record<string, string>;
  anchorPartitionMap: Record<string, string>;
  ancestryLinks: AncestryLink[];
  inheritedScars: string[];
  childSpecificScars: Record<string, string[]>;
  rationale: string;
  createdAt: string;
}

export type MutationPlan = MergePlan | SplitPlan;

export interface MutationHistoryEvent {
  eventId: string;
  schemaVersion: string;
  mutationType: MutationType;
  planId: string;
  affectedCanonicalIds: string[];
  ancestryLinks: AncestryLink[];
  priorVersionRefs: string[];
  resultingVersionRefs: string[];
  claimMigrationSummary: string;
  reconciliationId: string;
  executedAt: string;
  reversible: boolean;
  policyVersion: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY STORES
// ═══════════════════════════════════════════════════════════════════════════════

const _mutationHistory: MutationHistoryEvent[] = [];
const _mutationPlans: MutationPlan[] = [];
const _ancestryIndex = new Map<string, AncestryLink[]>();

// ═══════════════════════════════════════════════════════════════════════════════
// MERGE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function createMergePlan(input: {
  sourceCanonicalIds: string[];
  targetCanonicalId: string;
  objectType: CanonicalObjectType;
  winningAnchorRefs: string[];
  claimPartitionMap: Record<string, string>;
  preservedConflictIds: string[];
  preservedConfidenceHistoryRefs: string[];
  rationale: string;
}): MergePlan {
  const now = new Date().toISOString();
  const plan: MergePlan = {
    planId: `mplan_${uuidv4()}`,
    schemaVersion: L34_MERGE_SCHEMA_VERSION,
    mergeType: 'MERGE',
    ...input,
    ancestryLinks: input.sourceCanonicalIds.map(srcId => ({
      parentCanonicalId: srcId,
      childCanonicalId: input.targetCanonicalId,
      relation: 'MERGED_INTO' as const,
      createdAt: now,
    })),
    createdAt: now,
  };
  _mutationPlans.push(plan);
  return plan;
}

export function applyMergeMutation(
  plan: MergePlan,
  reconciliationId: string,
): MutationHistoryEvent {
  const event: MutationHistoryEvent = {
    eventId: `mevt_${uuidv4()}`,
    schemaVersion: L34_MUTATION_EVENT_SCHEMA_VERSION,
    mutationType: 'MERGE',
    planId: plan.planId,
    affectedCanonicalIds: [...plan.sourceCanonicalIds, plan.targetCanonicalId],
    ancestryLinks: plan.ancestryLinks,
    priorVersionRefs: plan.sourceCanonicalIds.map(id => `prior:${id}`),
    resultingVersionRefs: [`result:${plan.targetCanonicalId}`],
    claimMigrationSummary: `Merged ${plan.sourceCanonicalIds.length} objects into ${plan.targetCanonicalId}. ${Object.keys(plan.claimPartitionMap).length} claims migrated.`,
    reconciliationId,
    executedAt: new Date().toISOString(),
    reversible: true,
    policyVersion: L34_MUTATION_VERSION,
  };

  _mutationHistory.push(event);

  for (const link of plan.ancestryLinks) {
    const existing = _ancestryIndex.get(link.parentCanonicalId) ?? [];
    existing.push(link);
    _ancestryIndex.set(link.parentCanonicalId, existing);

    const childLinks = _ancestryIndex.get(link.childCanonicalId) ?? [];
    childLinks.push(link);
    _ancestryIndex.set(link.childCanonicalId, childLinks);
  }

  return event;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPLIT OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

export function createSplitPlan(input: {
  sourceCanonicalId: string;
  resultingCanonicalIds: string[];
  objectType: CanonicalObjectType;
  claimPartitionMap: Record<string, string>;
  anchorPartitionMap: Record<string, string>;
  inheritedScars: string[];
  childSpecificScars: Record<string, string[]>;
  rationale: string;
}): SplitPlan {
  const now = new Date().toISOString();
  const plan: SplitPlan = {
    planId: `splan_${uuidv4()}`,
    schemaVersion: L34_SPLIT_SCHEMA_VERSION,
    splitType: 'SPLIT',
    ...input,
    ancestryLinks: input.resultingCanonicalIds.map(childId => ({
      parentCanonicalId: input.sourceCanonicalId,
      childCanonicalId: childId,
      relation: 'SPLIT_FROM' as const,
      createdAt: now,
    })),
    createdAt: now,
  };
  _mutationPlans.push(plan);
  return plan;
}

export function applySplitMutation(
  plan: SplitPlan,
  reconciliationId: string,
): MutationHistoryEvent {
  const event: MutationHistoryEvent = {
    eventId: `mevt_${uuidv4()}`,
    schemaVersion: L34_MUTATION_EVENT_SCHEMA_VERSION,
    mutationType: 'SPLIT',
    planId: plan.planId,
    affectedCanonicalIds: [plan.sourceCanonicalId, ...plan.resultingCanonicalIds],
    ancestryLinks: plan.ancestryLinks,
    priorVersionRefs: [`prior:${plan.sourceCanonicalId}`],
    resultingVersionRefs: plan.resultingCanonicalIds.map(id => `result:${id}`),
    claimMigrationSummary: `Split ${plan.sourceCanonicalId} into ${plan.resultingCanonicalIds.length} objects. ${Object.keys(plan.claimPartitionMap).length} claims partitioned.`,
    reconciliationId,
    executedAt: new Date().toISOString(),
    reversible: true,
    policyVersion: L34_MUTATION_VERSION,
  };

  _mutationHistory.push(event);

  for (const link of plan.ancestryLinks) {
    const parentLinks = _ancestryIndex.get(link.parentCanonicalId) ?? [];
    parentLinks.push(link);
    _ancestryIndex.set(link.parentCanonicalId, parentLinks);

    const childLinks = _ancestryIndex.get(link.childCanonicalId) ?? [];
    childLinks.push(link);
    _ancestryIndex.set(link.childCanonicalId, childLinks);
  }

  return event;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY
// ═══════════════════════════════════════════════════════════════════════════════

export function getMutationHistory(): readonly MutationHistoryEvent[] {
  return _mutationHistory;
}

export function getMutationHistoryForCanonicalId(
  canonicalId: string,
): MutationHistoryEvent[] {
  return _mutationHistory.filter(e => e.affectedCanonicalIds.includes(canonicalId));
}

export function getAncestryLinks(canonicalId: string): AncestryLink[] {
  return _ancestryIndex.get(canonicalId) ?? [];
}

export function getMutationPlan(planId: string): MutationPlan | undefined {
  return _mutationPlans.find(p => p.planId === planId);
}

export function getAllMutationPlans(): readonly MutationPlan[] {
  return _mutationPlans;
}

export function resetMutationHistory(): void {
  _mutationHistory.length = 0;
  _mutationPlans.length = 0;
  _ancestryIndex.clear();
}
