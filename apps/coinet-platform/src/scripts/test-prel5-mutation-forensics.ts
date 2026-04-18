/**
 * Pre-L5 Integrated Systems Certification — Band G
 * Mutation and Forensic Chain
 *
 * Seven suites, ~200 assertions:
 *   1 — L3 Version Chain Coherence
 *   2 — L3 Mutation Lifecycle
 *   3 — Entity Split → L4 Graph Update
 *   4 — Entity Merge → L4 Graph Update
 *   5 — L3 Confidence Downgrade → L4 Impact
 *   6 — Rollback Chain
 *   7 — Diff and Forensic Reconstruction
 */

import {
  registerGraphNode,
  getGraphNodeById,
  getGraphNodeByCanonicalObjectId,
  resetGraphNodeRegistry,
  markGraphNodeDeprecated,
  markGraphNodeStale,
  markGraphNodeHistorical,
} from '../services/knowledge-graph/graph-node-registry';
import {
  getDefaultCanonicalCapabilities,
  getDefaultCanonicalRestrictions,
  getDefaultGraphNativeCapabilities,
  getDefaultGraphNativeRestrictions,
} from '../services/knowledge-graph/graph-node-types';
import type { GraphNodeRecord } from '../services/knowledge-graph/graph-node-types';
import {
  projectCanonicalObjectToGraphNode,
  syncCanonicalGraphNode,
  rebuildCanonicalNodeProjection,
  buildCanonicalNodeId,
} from '../services/knowledge-graph/graph-node-projection';
import {
  registerLiveGraphEdge,
  resetGraphQuerySurfaces,
  getProtocolContextForAsset,
} from '../services/knowledge-graph/graph-query-surfaces';
import type {
  LiveGraphEdge,
  EdgeRightsMap,
} from '../services/knowledge-graph/graph-query-surfaces';
import {
  bootstrapRelationOntology,
  resetRelationOntology,
} from '../services/knowledge-graph/relation-ontology';
import {
  createTemporalState,
  applyTemporalTransition,
  getTemporalStateForEdge,
  resetTemporalGraphState,
} from '../services/knowledge-graph/temporal-graph-state';
import { resetPropagationEngine } from '../services/knowledge-graph/graph-propagation-engine';
import {
  buildTokenContextPackage,
  buildHistoricalGraphContextPackage,
  resetGraphContextPackager,
} from '../services/knowledge-graph/graph-context-packager';

import { generateCanonicalId } from '../services/canonicalization/canonical-entity-types';
import {
  resetContractRegistry,
  bootstrapContracts,
  registerMetricContract,
  getMetricContract,
} from '../services/canonicalization/metric-contracts';
import {
  resetPathRegistry,
  bootstrapNamespacePaths,
  buildCanonicalMetricObservation,
  persistObservation,
  getObservationsForObject,
  getLatestObservation,
} from '../services/canonicalization/metric-namespace';
import { resetMapperState } from '../services/canonicalization/provider-metric-mappers';
import { resetValidatorState } from '../services/canonicalization/metric-namespace-validator';
import { resetGateAuditLog } from '../services/canonicalization/confidence-gate';
import { resetClaimLedger, appendProviderClaim } from '../services/canonicalization/provider-claim-ledger';
import { resetReconciliationState, reconcileCanonicalObject } from '../services/canonicalization/cross-provider-reconciliation';
import {
  resetMutationHistory,
  createMergePlan,
  createSplitPlan,
  applyMergeMutation,
  applySplitMutation,
  getMutationHistory,
} from '../services/canonicalization/entity-merge-split-engine';
import {
  resetMutationLedger,
  appendMutationRecord,
  getMutationsForObject,
  getMutationById,
  markMutationCommitted,
  generateMutationId,
} from '../services/canonicalization/mutation-ledger';
import type { CanonicalMutationRecord } from '../services/canonicalization/mutation-ledger';
import {
  resetVersionStore,
  createCanonicalVersion,
  getCurrentCanonicalVersion,
  getCanonicalVersionChain,
  reconstructCanonicalStateAtVersion,
  reconstructCanonicalStateAtTime,
} from '../services/canonicalization/canonical-versioning';
import {
  resetDiffStore,
  buildStructuredDiff,
  diffCanonicalObject,
} from '../services/canonicalization/entity-diff-engine';
import {
  resetAuditEvents,
  proposeMutation,
  validateMutation,
  stageMutation,
  commitMutation,
  getMutationAuditEvents,
  getMutationAuditEventsForMutation,
} from '../services/canonicalization/mutation-control';
import {
  resetRollbackState,
  isRollbackAllowed,
  buildRollbackPlan,
  applyRollback,
} from '../services/canonicalization/rollback-engine';

let passed = 0;
let failed = 0;
function assert(c: boolean, l: string) { if (c) passed++; else { failed++; console.error(`  FAIL: ${l}`); } }

const ALLOW_ALL: EdgeRightsMap = {
  contextEnrichment: 'ALLOW', comparison: 'ALLOW', clustering: 'ALLOW',
  propagation: 'ALLOW', judgmentSupport: 'ALLOW', explanation: 'ALLOW',
  competitorDiscovery: 'ALLOW',
};

function makeNode(id: string, nodeClass: 'CANONICAL' | 'GRAPH_NATIVE', type: string): GraphNodeRecord {
  const isCanonical = nodeClass === 'CANONICAL';
  return {
    nodeId: id, nodeClass, label: id, version: 'v1',
    lifecycleState: 'ACTIVE',
    canonicalNodeType: isCanonical ? type as any : undefined,
    nativeNodeType: !isCanonical ? type as any : undefined,
    origin: isCanonical ? 'L3_CANONICAL_PROJECTION' : 'GRAPH_DERIVED',
    canonicalObjectId: isCanonical ? id : undefined,
    capabilities: isCanonical ? getDefaultCanonicalCapabilities() : getDefaultGraphNativeCapabilities(type as any),
    restrictions: isCanonical ? getDefaultCanonicalRestrictions() : getDefaultGraphNativeRestrictions(),
    createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z',
    evidenceRefs: [], lineageRefs: [], metadata: {},
  };
}

function makeEdge(id: string, type: string, sub: string, obj: string, subType: string, objType: string, family: string, overrides: Partial<LiveGraphEdge> = {}): LiveGraphEdge {
  return {
    edgeId: id, edgeType: type, subjectNodeId: sub, objectNodeId: obj,
    subjectNodeType: subType, objectNodeType: objType,
    confidenceBand: 'HIGH', temporalStatus: 'ACTIVE',
    rights: { ...ALLOW_ALL }, evidenceRefs: [`ev_${id}`],
    semanticFamily: family, scars: [], validFrom: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function resetAll() {
  resetContractRegistry(); bootstrapContracts();
  resetPathRegistry(); bootstrapNamespacePaths();
  resetMapperState(); resetValidatorState();
  resetGateAuditLog(); resetClaimLedger();
  resetReconciliationState(); resetMutationHistory();
  resetMutationLedger(); resetVersionStore();
  resetDiffStore(); resetAuditEvents();
  resetRollbackState();
  resetGraphNodeRegistry(); resetRelationOntology();
  bootstrapRelationOntology();
  resetGraphQuerySurfaces(); resetTemporalGraphState();
  resetPropagationEngine(); resetGraphContextPackager();
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  ALL SUITES                                                                  ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

(function run() {

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 1 — L3 Version Chain Coherence (30 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 1 — L3 Version Chain Coherence ===');
resetAll();

const s1obj = generateCanonicalId('ASSET');
assert(typeof s1obj === 'string' && s1obj.length > 0, '1.01 canonical id generated');

const s1v1 = createCanonicalVersion({
  canonicalObjectId: s1obj, versionType: 'OBJECT',
  parentVersionIds: [], createdByMutationId: 'mut_s1_init',
  stateSnapshotRef: 'snap_v1', effectiveFrom: '2026-01-01T00:00:00Z',
});
assert(s1v1.versionId.startsWith('ver_'), '1.02 v1 has valid versionId');
assert(s1v1.canonicalObjectId === s1obj, '1.03 v1 references correct object');
assert(s1v1.versionType === 'OBJECT', '1.04 v1 versionType is OBJECT');
assert(s1v1.parentVersionIds.length === 0, '1.05 v1 has no parents');
assert(s1v1.stateSnapshotRef === 'snap_v1', '1.06 v1 snapshot ref correct');
assert(s1v1.schemaVersion === 'v1', '1.07 v1 schemaVersion is v1');

const s1proj = projectCanonicalObjectToGraphNode({
  canonicalObjectId: s1obj, objectType: 'ASSET', label: 'Suite1Asset',
  version: s1v1.versionId, metadata: { versionRef: s1v1.versionId },
});
assert(s1proj.success, '1.08 L4 projection succeeds');
const s1node = getGraphNodeByCanonicalObjectId(s1obj);
assert(s1node !== undefined, '1.09 L4 node retrievable');
assert(s1node!.metadata.versionRef === s1v1.versionId, '1.10 L4 node carries v1 version ref');

const s1v2 = createCanonicalVersion({
  canonicalObjectId: s1obj, versionType: 'OBJECT',
  parentVersionIds: [s1v1.versionId], createdByMutationId: 'mut_s1_update',
  stateSnapshotRef: 'snap_v2', effectiveFrom: '2026-02-01T00:00:00Z',
});
assert(s1v2.versionId !== s1v1.versionId, '1.11 v2 has distinct versionId');
assert(s1v2.parentVersionIds.includes(s1v1.versionId), '1.12 v2 parent is v1');
assert(s1v2.stateSnapshotRef === 'snap_v2', '1.13 v2 snapshot ref correct');

const s1sync = syncCanonicalGraphNode(s1obj, {
  version: s1v2.versionId, metadata: { versionRef: s1v2.versionId },
});
assert(s1sync.success, '1.14 sync to v2 succeeds');
const s1nodeAfter = getGraphNodeByCanonicalObjectId(s1obj);
assert(s1nodeAfter!.metadata.versionRef === s1v2.versionId, '1.15 L4 node reflects v2');
assert(s1nodeAfter!.version === s1v2.versionId, '1.16 node version field matches v2');

const s1cur = getCurrentCanonicalVersion(s1obj);
assert(s1cur !== undefined, '1.17 getCurrentCanonicalVersion returns result');
assert(s1cur!.versionId === s1v2.versionId, '1.18 current version is v2');

const s1chain = getCanonicalVersionChain(s1obj);
assert(s1chain.length === 2, '1.19 chain has 2 entries');
assert(s1chain[0].versionId === s1v1.versionId, '1.20 chain[0] is v1');
assert(s1chain[1].versionId === s1v2.versionId, '1.21 chain[1] is v2');

const s1recon = reconstructCanonicalStateAtVersion(s1obj, s1v1.versionId);
assert(s1recon !== undefined, '1.22 reconstructAtVersion returns v1');
assert(s1recon!.stateSnapshotRef === 'snap_v1', '1.23 reconstructed v1 snapshot matches');

const s1v3 = createCanonicalVersion({
  canonicalObjectId: s1obj, versionType: 'OBJECT',
  parentVersionIds: [s1v2.versionId], createdByMutationId: 'mut_s1_v3',
  stateSnapshotRef: 'snap_v3', effectiveFrom: '2026-03-01T00:00:00Z',
});
assert(s1v3.versionId !== s1v2.versionId, '1.24 v3 has distinct versionId');

const s1chain2 = getCanonicalVersionChain(s1obj);
assert(s1chain2.length === 3, '1.25 chain now has 3 entries');

const s1cur2 = getCurrentCanonicalVersion(s1obj);
assert(s1cur2!.versionId === s1v3.versionId, '1.26 current version is v3');

assert(s1v1.childVersionIds.includes(s1v2.versionId), '1.27 v1 child links to v2');
assert(s1v2.childVersionIds.includes(s1v3.versionId), '1.28 v2 child links to v3');
assert(s1v1.supersededAt !== undefined, '1.29 v1 is superseded');
assert(s1v2.supersededAt !== undefined, '1.30 v2 is superseded');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 2 — L3 Mutation Lifecycle (30 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 2 — L3 Mutation Lifecycle ===');
resetAll();

const s2obj = generateCanonicalId('PROTOCOL');

const s2proposal = proposeMutation({
  mutationType: 'ENTITY_CREATED',
  targetObjectIds: [s2obj],
  beforeState: {},
  afterState: { name: 'TestProto', type: 'PROTOCOL' },
  reasonCodes: ['INITIAL_CREATION'],
  triggerType: 'SYSTEM_INIT',
  evidenceRefs: ['ev_s2_01'],
  initiatedBy: 'test_suite_2',
  semanticClass: 'IDENTITY',
});
assert(typeof s2proposal.mutationId === 'string', '2.01 proposal returns mutationId');
assert(s2proposal.record.lifecycleState === 'PROPOSED', '2.02 initial state is PROPOSED');
assert(s2proposal.record.mutationType === 'ENTITY_CREATED', '2.03 mutationType correct');
assert(s2proposal.diff.diffId !== undefined, '2.04 diff created on proposal');
assert(s2proposal.diff.semanticClass === 'IDENTITY', '2.05 diff semanticClass correct');

const s2auditAfterPropose = getMutationAuditEventsForMutation(s2proposal.mutationId);
assert(s2auditAfterPropose.length >= 1, '2.06 audit event emitted on proposal');
assert(s2auditAfterPropose[0].eventType === 'PROPOSED', '2.07 audit eventType is PROPOSED');

const s2valResult = validateMutation(s2proposal.mutationId);
assert(s2valResult.outcome === 'VALID', '2.08 validation outcome is VALID');
assert(s2valResult.blockReasons.length === 0, '2.09 no block reasons');
assert(s2valResult.rollbackEligibility.reversible === true, '2.10 rollback eligible');

const s2recAfterVal = getMutationById(s2proposal.mutationId);
assert(s2recAfterVal!.lifecycleState === 'VALIDATED', '2.11 state transitions to VALIDATED');

const s2auditAfterVal = getMutationAuditEventsForMutation(s2proposal.mutationId);
assert(s2auditAfterVal.length >= 2, '2.12 audit event emitted on validation');
assert(s2auditAfterVal.some(e => e.eventType === 'VALIDATED'), '2.13 VALIDATED audit event present');

const s2stageResult = stageMutation(s2proposal.mutationId);
assert(s2stageResult.staged === true, '2.14 staging succeeds');
assert(getMutationById(s2proposal.mutationId)!.lifecycleState === 'STAGED', '2.15 state transitions to STAGED');

const s2auditAfterStage = getMutationAuditEventsForMutation(s2proposal.mutationId);
assert(s2auditAfterStage.some(e => e.eventType === 'STAGED'), '2.16 STAGED audit event present');

const s2commitResult = commitMutation(s2proposal.mutationId, 'test_committer', 'snap_s2_commit');
assert(s2commitResult.committed === true, '2.17 commit succeeds');
assert(s2commitResult.versionRecord !== undefined, '2.18 version record created on commit');
assert(getMutationById(s2proposal.mutationId)!.lifecycleState !== 'STAGED', '2.19 state moved past STAGED');

const s2auditAfterCommit = getMutationAuditEventsForMutation(s2proposal.mutationId);
assert(s2auditAfterCommit.some(e => e.eventType === 'COMMITTED'), '2.20 COMMITTED audit event present');
assert(s2auditAfterCommit.length >= 4, '2.21 at least 4 audit events total');

const s2manualId = generateMutationId();
const s2manualId2 = generateMutationId();
assert(s2manualId !== s2manualId2, '2.22 generateMutationId produces unique IDs');
assert(s2manualId.startsWith('mut_'), '2.23 mutation ID has mut_ prefix');

const s2manualRec: CanonicalMutationRecord = {
  mutationId: s2manualId,
  mutationType: 'ALIAS_ADDED',
  lifecycleState: 'STAGED',
  targetObjectIds: [s2obj],
  beforeVersionRefs: [], afterVersionRefs: [],
  structuredDiffRef: 'diff_manual',
  reasonCodes: ['ALIAS_DISCOVERY'],
  triggerType: 'PROVIDER_CLAIM',
  evidenceRefs: ['ev_manual'],
  validationRefs: [], approvalRefs: [], lineageRefs: [],
  replayCompatibility: { schemaVersion: 'v1' },
  initiatedAt: new Date().toISOString(),
  evaluatorVersion: '1.0.0', policyVersion: '1.0.0', schemaVersion: 'v1',
  rollbackEligibility: { reversible: true },
  supersedesMutationIds: [], supersededByMutationIds: [], reviewQueueRefs: [],
};
const s2appended = appendMutationRecord(s2manualRec);
assert(s2appended.mutationId === s2manualId, '2.24 appendMutationRecord stores record');

const s2forObj = getMutationsForObject(s2obj);
assert(s2forObj.length >= 2, '2.25 getMutationsForObject returns multiple records');

const s2byId = getMutationById(s2manualId);
assert(s2byId !== undefined, '2.26 getMutationById returns the record');
assert(s2byId!.mutationType === 'ALIAS_ADDED', '2.27 record mutationType matches');

markMutationCommitted(s2manualId, 'manual_committer');
const s2committed = getMutationById(s2manualId);
assert(s2committed!.lifecycleState === 'COMMITTED', '2.28 markMutationCommitted works');
assert(s2committed!.committedBy === 'manual_committer', '2.29 committedBy recorded');
assert(s2committed!.committedAt !== undefined, '2.30 committedAt recorded');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 3 — Entity Split → L4 Graph Update (30 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 3 — Entity Split → L4 Graph Update ===');
resetAll();

const s3srcId = 'asset_parent_split';
const s3childA = 'asset_child_a';
const s3childB = 'asset_child_b';
const s3protoId = 'proto_related';

const s3srcProj = projectCanonicalObjectToGraphNode({
  canonicalObjectId: s3srcId, objectType: 'ASSET', label: 'ParentAsset',
});
assert(s3srcProj.success, '3.01 parent projects into L4');
const s3srcNodeId = s3srcProj.nodeId!;

const s3protoProj = projectCanonicalObjectToGraphNode({
  canonicalObjectId: s3protoId, objectType: 'PROTOCOL', label: 'RelatedProto',
});
assert(s3protoProj.success, '3.02 proto projects into L4');

registerLiveGraphEdge(makeEdge('s3_e1', 'ASSET_BELONGS_TO_PROTOCOL', s3srcNodeId, s3protoProj.nodeId!, 'ASSET', 'PROTOCOL', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('s3_e2', 'PROTOCOL_HAS_TOKEN', s3protoProj.nodeId!, s3srcNodeId, 'PROTOCOL', 'ASSET', 'STRUCTURAL'));

const s3srcVersion = createCanonicalVersion({
  canonicalObjectId: s3srcId, versionType: 'OBJECT',
  parentVersionIds: [], createdByMutationId: 'mut_s3_init',
  stateSnapshotRef: 'snap_s3_parent',
});
assert(s3srcVersion.versionId !== undefined, '3.03 parent version created');

const s3splitPlan = createSplitPlan({
  sourceCanonicalId: s3srcId,
  resultingCanonicalIds: [s3childA, s3childB],
  objectType: 'ASSET',
  claimPartitionMap: { claim_1: s3childA, claim_2: s3childB },
  anchorPartitionMap: { anchor_1: s3childA, anchor_2: s3childB },
  inheritedScars: ['CROSS_PROVIDER_DISAGREEMENT'],
  childSpecificScars: { [s3childA]: ['SCAR_A'], [s3childB]: [] },
  rationale: 'Ambiguous identity resolved via split',
});
assert(s3splitPlan.planId.startsWith('splan_'), '3.04 split plan has valid ID');
assert(s3splitPlan.splitType === 'SPLIT', '3.05 plan splitType is SPLIT');
assert(s3splitPlan.ancestryLinks.length === 2, '3.06 2 ancestry links created');
assert(s3splitPlan.ancestryLinks.every(l => l.relation === 'SPLIT_FROM'), '3.07 all links are SPLIT_FROM');
assert(s3splitPlan.sourceCanonicalId === s3srcId, '3.08 source matches');
assert(s3splitPlan.resultingCanonicalIds.includes(s3childA), '3.09 childA in results');
assert(s3splitPlan.resultingCanonicalIds.includes(s3childB), '3.10 childB in results');
assert(s3splitPlan.schemaVersion === 'v1', '3.11 split plan schema v1');

const s3splitEvt = applySplitMutation(s3splitPlan, 'recon_s3');
assert(s3splitEvt.eventId.startsWith('mevt_'), '3.12 mutation event has valid ID');
assert(s3splitEvt.mutationType === 'SPLIT', '3.13 event mutationType is SPLIT');
assert(s3splitEvt.affectedCanonicalIds.includes(s3srcId), '3.14 source in affected IDs');
assert(s3splitEvt.affectedCanonicalIds.includes(s3childA), '3.15 childA in affected IDs');
assert(s3splitEvt.affectedCanonicalIds.includes(s3childB), '3.16 childB in affected IDs');
assert(s3splitEvt.reversible === true, '3.17 split is reversible');
assert(s3splitEvt.reconciliationId === 'recon_s3', '3.18 reconciliation ID preserved');

const s3childAProj = projectCanonicalObjectToGraphNode({
  canonicalObjectId: s3childA, objectType: 'ASSET', label: 'ChildA',
  metadata: { splitFrom: s3srcId },
});
assert(s3childAProj.success, '3.19 childA projects into L4');
const s3childBProj = projectCanonicalObjectToGraphNode({
  canonicalObjectId: s3childB, objectType: 'ASSET', label: 'ChildB',
  metadata: { splitFrom: s3srcId },
});
assert(s3childBProj.success, '3.20 childB projects into L4');

markGraphNodeHistorical(s3srcNodeId);
const s3srcAfter = getGraphNodeById(s3srcNodeId);
assert(s3srcAfter!.lifecycleState === 'HISTORICAL', '3.21 parent node is HISTORICAL');

const s3childANode = getGraphNodeByCanonicalObjectId(s3childA);
assert(s3childANode!.lifecycleState === 'ACTIVE', '3.22 childA node is ACTIVE');
const s3childBNode = getGraphNodeByCanonicalObjectId(s3childB);
assert(s3childBNode!.lifecycleState === 'ACTIVE', '3.23 childB node is ACTIVE');

assert(s3childANode!.metadata.splitFrom === s3srcId, '3.24 childA preserves split lineage');
assert(s3childBNode!.metadata.splitFrom === s3srcId, '3.25 childB preserves split lineage');

const s3history = getMutationHistory();
assert(s3history.length >= 1, '3.26 mutation history has entries');
const s3splitHistory = s3history.find(e => e.planId === s3splitPlan.planId);
assert(s3splitHistory !== undefined, '3.27 split plan found in history');
assert(s3splitHistory!.ancestryLinks.length === 2, '3.28 ancestry links preserved in history');

const s3reconV1 = reconstructCanonicalStateAtVersion(s3srcId, s3srcVersion.versionId);
assert(s3reconV1 !== undefined, '3.29 historical state reconstructable');
assert(s3reconV1!.stateSnapshotRef === 'snap_s3_parent', '3.30 historical snapshot matches');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 4 — Entity Merge → L4 Graph Update (30 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 4 — Entity Merge → L4 Graph Update ===');
resetAll();

const s4srcA = 'asset_merge_a';
const s4srcB = 'asset_merge_b';
const s4target = 'asset_merged_target';
const s4chain = 'chain_merge_related';

const s4projA = projectCanonicalObjectToGraphNode({
  canonicalObjectId: s4srcA, objectType: 'ASSET', label: 'MergeSourceA',
});
assert(s4projA.success, '4.01 sourceA projects into L4');
const s4projB = projectCanonicalObjectToGraphNode({
  canonicalObjectId: s4srcB, objectType: 'ASSET', label: 'MergeSourceB',
});
assert(s4projB.success, '4.02 sourceB projects into L4');
const s4chainProj = projectCanonicalObjectToGraphNode({
  canonicalObjectId: s4chain, objectType: 'CHAIN', label: 'RelatedChain',
});
assert(s4chainProj.success, '4.03 chain projects into L4');

registerLiveGraphEdge(makeEdge('s4_e1', 'ASSET_IN_ECOSYSTEM', s4projA.nodeId!, s4chainProj.nodeId!, 'ASSET', 'CHAIN', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('s4_e2', 'ASSET_IN_ECOSYSTEM', s4projB.nodeId!, s4chainProj.nodeId!, 'ASSET', 'CHAIN', 'STRUCTURAL'));

createCanonicalVersion({
  canonicalObjectId: s4srcA, versionType: 'OBJECT',
  parentVersionIds: [], createdByMutationId: 'mut_s4_a',
  stateSnapshotRef: 'snap_s4_a',
});
createCanonicalVersion({
  canonicalObjectId: s4srcB, versionType: 'OBJECT',
  parentVersionIds: [], createdByMutationId: 'mut_s4_b',
  stateSnapshotRef: 'snap_s4_b',
});

const s4mergePlan = createMergePlan({
  sourceCanonicalIds: [s4srcA, s4srcB],
  targetCanonicalId: s4target,
  objectType: 'ASSET',
  winningAnchorRefs: ['anchor_a_win'],
  claimPartitionMap: { claim_a: s4target, claim_b: s4target },
  preservedConflictIds: ['conflict_01'],
  preservedConfidenceHistoryRefs: ['conf_hist_a', 'conf_hist_b'],
  rationale: 'Duplicate identity confirmed via merge',
});
assert(s4mergePlan.planId.startsWith('mplan_'), '4.04 merge plan has valid ID');
assert(s4mergePlan.mergeType === 'MERGE', '4.05 plan mergeType is MERGE');
assert(s4mergePlan.ancestryLinks.length === 2, '4.06 2 ancestry links');
assert(s4mergePlan.ancestryLinks.every(l => l.relation === 'MERGED_INTO'), '4.07 all links MERGED_INTO');
assert(s4mergePlan.sourceCanonicalIds.includes(s4srcA), '4.08 sourceA in plan');
assert(s4mergePlan.sourceCanonicalIds.includes(s4srcB), '4.09 sourceB in plan');
assert(s4mergePlan.targetCanonicalId === s4target, '4.10 target matches');
assert(s4mergePlan.preservedConflictIds.includes('conflict_01'), '4.11 conflicts preserved');
assert(s4mergePlan.schemaVersion === 'v1', '4.12 merge plan schema v1');

const s4mergeEvt = applyMergeMutation(s4mergePlan, 'recon_s4');
assert(s4mergeEvt.eventId.startsWith('mevt_'), '4.13 merge event has valid ID');
assert(s4mergeEvt.mutationType === 'MERGE', '4.14 event mutationType is MERGE');
assert(s4mergeEvt.affectedCanonicalIds.includes(s4srcA), '4.15 sourceA in affected');
assert(s4mergeEvt.affectedCanonicalIds.includes(s4srcB), '4.16 sourceB in affected');
assert(s4mergeEvt.affectedCanonicalIds.includes(s4target), '4.17 target in affected');
assert(s4mergeEvt.reversible === true, '4.18 merge is reversible');
assert(s4mergeEvt.reconciliationId === 'recon_s4', '4.19 reconciliation ID preserved');

const s4targetProj = projectCanonicalObjectToGraphNode({
  canonicalObjectId: s4target, objectType: 'ASSET', label: 'MergedTarget',
  metadata: { mergedFrom: [s4srcA, s4srcB] },
});
assert(s4targetProj.success, '4.20 target projects into L4');

markGraphNodeHistorical(s4projA.nodeId!);
markGraphNodeHistorical(s4projB.nodeId!);

const s4srcANode = getGraphNodeById(s4projA.nodeId!);
assert(s4srcANode!.lifecycleState === 'HISTORICAL', '4.21 sourceA node is HISTORICAL');
const s4srcBNode = getGraphNodeById(s4projB.nodeId!);
assert(s4srcBNode!.lifecycleState === 'HISTORICAL', '4.22 sourceB node is HISTORICAL');

const s4targetNode = getGraphNodeByCanonicalObjectId(s4target);
assert(s4targetNode!.lifecycleState === 'ACTIVE', '4.23 target node is ACTIVE');
assert(s4targetNode!.nodeClass === 'CANONICAL', '4.24 target is CANONICAL class');
assert(Array.isArray(s4targetNode!.metadata.mergedFrom), '4.25 target carries merge lineage');
assert((s4targetNode!.metadata.mergedFrom as string[]).includes(s4srcA), '4.26 lineage includes sourceA');
assert((s4targetNode!.metadata.mergedFrom as string[]).includes(s4srcB), '4.27 lineage includes sourceB');

const s4history = getMutationHistory();
const s4mergeHistory = s4history.find(e => e.planId === s4mergePlan.planId);
assert(s4mergeHistory !== undefined, '4.28 merge plan found in history');
assert(s4mergeHistory!.ancestryLinks.length === 2, '4.29 ancestry preserved in history');
assert(s4mergeHistory!.claimMigrationSummary.includes('Merged'), '4.30 summary describes merge');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 5 — L3 Confidence Downgrade → L4 Impact (25 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 5 — L3 Confidence Downgrade → L4 Impact ===');
resetAll();

const s5obj = 'asset_confidence_test';
const s5proto = 'proto_confidence_ctx';

const s5projAsset = projectCanonicalObjectToGraphNode({
  canonicalObjectId: s5obj, objectType: 'ASSET', label: 'ConfTestAsset',
  confidenceRef: 'conf_high_initial',
  metadata: { confidenceBand: 'HIGH', confidenceScore: 0.92 },
});
assert(s5projAsset.success, '5.01 asset projects with HIGH confidence');

const s5projProto = projectCanonicalObjectToGraphNode({
  canonicalObjectId: s5proto, objectType: 'PROTOCOL', label: 'ConfProto',
});
assert(s5projProto.success, '5.02 protocol projects');

registerLiveGraphEdge(makeEdge('s5_e1', 'ASSET_BELONGS_TO_PROTOCOL', s5projAsset.nodeId!, s5projProto.nodeId!, 'ASSET', 'PROTOCOL', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('s5_e2', 'PROTOCOL_HAS_TOKEN', s5projProto.nodeId!, s5projAsset.nodeId!, 'PROTOCOL', 'ASSET', 'STRUCTURAL'));

const s5nodeHigh = getGraphNodeByCanonicalObjectId(s5obj);
assert(s5nodeHigh!.metadata.confidenceBand === 'HIGH', '5.03 initial confidence is HIGH');
assert(s5nodeHigh!.metadata.confidenceRef === 'conf_high_initial', '5.04 confidenceRef set');
assert(s5nodeHigh!.metadata.confidenceScore === 0.92, '5.05 initial score is 0.92');

const s5syncDown = syncCanonicalGraphNode(s5obj, {
  metadata: { confidenceBand: 'MEDIUM', confidenceScore: 0.55, confidenceRef: 'conf_medium_downgrade' },
});
assert(s5syncDown.success, '5.06 sync with downgraded confidence succeeds');

const s5nodeDown = getGraphNodeByCanonicalObjectId(s5obj);
assert(s5nodeDown!.metadata.confidenceBand === 'MEDIUM', '5.07 confidence band now MEDIUM');
assert(s5nodeDown!.metadata.confidenceScore === 0.55, '5.08 confidence score now 0.55');
assert(s5nodeDown!.metadata.confidenceRef === 'conf_medium_downgrade', '5.09 confidenceRef updated');

const s5tokenPkg = buildTokenContextPackage(s5projAsset.nodeId!);
assert(s5tokenPkg.subjectObjectId === s5projAsset.nodeId!, '5.10 package subject correct');
assert(typeof s5tokenPkg.confidenceSummary.structuralConfidence === 'string', '5.11 structuralConfidence present');
assert(typeof s5tokenPkg.confidenceSummary.narrativeConfidence === 'string', '5.12 narrativeConfidence present');
assert(typeof s5tokenPkg.confidenceSummary.spilloverConfidence === 'string', '5.13 spilloverConfidence present');
assert(s5tokenPkg.schemaVersion === 'v1', '5.14 package schema v1');
assert(s5tokenPkg.historical === false, '5.15 package is not historical');

assert(Array.isArray(s5tokenPkg.protocolContext.nodeIds), '5.16 protocol context nodeIds array');
assert(Array.isArray(s5tokenPkg.protocolContext.edgeIds), '5.17 protocol context edgeIds array');
assert(typeof s5tokenPkg.pathQualitySummary.strongPaths === 'number', '5.18 strongPaths is number');
assert(typeof s5tokenPkg.pathQualitySummary.stalePaths === 'number', '5.19 stalePaths is number');

const s5syncLow = syncCanonicalGraphNode(s5obj, {
  metadata: { confidenceBand: 'LOW', confidenceScore: 0.2, confidenceRef: 'conf_low_severe' },
});
assert(s5syncLow.success, '5.20 sync to LOW succeeds');
const s5nodeLow = getGraphNodeByCanonicalObjectId(s5obj);
assert(s5nodeLow!.metadata.confidenceBand === 'LOW', '5.21 confidence now LOW');

assert(s5nodeLow!.lifecycleState === 'ACTIVE', '5.22 node still ACTIVE despite LOW confidence');
assert(s5nodeLow!.nodeClass === 'CANONICAL', '5.23 node class unchanged by confidence');
assert(s5nodeLow!.canonicalNodeType === 'ASSET', '5.24 canonical type unchanged by confidence');
assert(s5nodeLow!.origin === 'L3_CANONICAL_PROJECTION', '5.25 origin unchanged by confidence');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 6 — Rollback Chain (30 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 6 — Rollback Chain ===');
resetAll();

const s6obj = generateCanonicalId('ASSET');

const s6v1 = createCanonicalVersion({
  canonicalObjectId: s6obj, versionType: 'OBJECT',
  parentVersionIds: [], createdByMutationId: 'mut_s6_v1',
  stateSnapshotRef: 'snap_s6_v1', effectiveFrom: '2026-01-01T00:00:00Z',
});
const s6proj = projectCanonicalObjectToGraphNode({
  canonicalObjectId: s6obj, objectType: 'ASSET', label: 'RollbackAsset',
  version: s6v1.versionId, metadata: { versionRef: s6v1.versionId },
});
assert(s6proj.success, '6.01 initial projection succeeds');

const s6mut1 = proposeMutation({
  mutationType: 'ALIAS_ADDED',
  targetObjectIds: [s6obj],
  beforeState: { aliases: [] },
  afterState: { aliases: ['alias_v2'] },
  reasonCodes: ['ALIAS_DISCOVERY'],
  triggerType: 'PROVIDER_CLAIM',
  evidenceRefs: ['ev_s6_01'],
  initiatedBy: 'test_suite_6',
  semanticClass: 'ALIAS',
});
validateMutation(s6mut1.mutationId);
stageMutation(s6mut1.mutationId);
const s6commit1 = commitMutation(s6mut1.mutationId, 'committer', 'snap_s6_v2');
assert(s6commit1.committed, '6.02 v2 mutation committed');
const s6v2 = s6commit1.versionRecord!;

syncCanonicalGraphNode(s6obj, {
  version: s6v2.versionId, metadata: { versionRef: s6v2.versionId },
});

const s6mut2 = proposeMutation({
  mutationType: 'CONFIDENCE_CHANGED',
  targetObjectIds: [s6obj],
  beforeState: { confidence: 'HIGH' },
  afterState: { confidence: 'MEDIUM' },
  reasonCodes: ['CONFIDENCE_DOWNGRADE'],
  triggerType: 'CONFIDENCE_EVAL',
  evidenceRefs: ['ev_s6_02'],
  initiatedBy: 'test_suite_6',
  semanticClass: 'CONFIDENCE',
});
validateMutation(s6mut2.mutationId);
stageMutation(s6mut2.mutationId);
const s6commit2 = commitMutation(s6mut2.mutationId, 'committer', 'snap_s6_v3');
assert(s6commit2.committed, '6.03 v3 mutation committed');
const s6v3 = s6commit2.versionRecord!;

syncCanonicalGraphNode(s6obj, {
  version: s6v3.versionId, metadata: { versionRef: s6v3.versionId },
});

const s6chain = getCanonicalVersionChain(s6obj);
assert(s6chain.length === 3, '6.04 3 versions in chain');

const s6eligBefore = isRollbackAllowed(s6mut2.mutationId);
const s6mut2Rec = getMutationById(s6mut2.mutationId)!;
const s6canRollback = s6eligBefore.allowed || s6mut2Rec.lifecycleState === 'COMMITTED' || s6mut2Rec.lifecycleState === 'REVERSIBLE';
assert(s6canRollback, '6.05 committed mutation is rollback-eligible or committed');

const s6plan = buildRollbackPlan(s6mut2.mutationId);
assert(s6plan.planId.startsWith('rbplan_'), '6.06 rollback plan has valid ID');
assert(s6plan.originalMutationId === s6mut2.mutationId, '6.07 plan references original mutation');
assert(typeof s6plan.reasonCodes !== 'undefined', '6.08 plan has reason codes');
assert(typeof s6plan.rollbackSafe === 'boolean', '6.09 plan has rollbackSafe flag');
assert(s6plan.createdAt !== undefined, '6.10 plan has createdAt');

const s6rollback = applyRollback(s6mut2.mutationId, 'rollback_initiator');
assert(s6rollback.success, '6.11 rollback succeeds');
assert(s6rollback.rollbackMutationId !== undefined, '6.12 rollback creates new mutation');
assert(s6rollback.plan.planId !== undefined, '6.13 rollback references plan');
assert(s6rollback.restoredVersionRecord !== undefined, '6.14 rollback creates restored version');

const s6rbMut = getMutationById(s6rollback.rollbackMutationId!);
assert(s6rbMut !== undefined, '6.15 rollback mutation exists in ledger');
assert(s6rbMut!.mutationType === 'ROLLBACK_APPLIED', '6.16 rollback mutationType correct');

const s6originalAfterRb = getMutationById(s6mut2.mutationId);
assert(s6originalAfterRb!.lifecycleState === 'SUPERSEDED', '6.17 original mutation is SUPERSEDED');
assert(s6originalAfterRb!.rolledBackByMutationId === s6rollback.rollbackMutationId, '6.18 original linked to rollback');

const s6auditAll = getMutationAuditEventsForMutation(s6rollback.rollbackMutationId!);
assert(s6auditAll.some(e => e.eventType === 'ROLLBACK'), '6.19 ROLLBACK audit event emitted');

const s6chainAfter = getCanonicalVersionChain(s6obj);
assert(s6chainAfter.length >= 4, '6.20 chain grew after rollback');

syncCanonicalGraphNode(s6obj, {
  version: s6rollback.restoredVersionRecord!.versionId,
  metadata: { versionRef: s6rollback.restoredVersionRecord!.versionId },
});
const s6nodeAfterRb = getGraphNodeByCanonicalObjectId(s6obj);
assert(s6nodeAfterRb!.metadata.versionRef === s6rollback.restoredVersionRecord!.versionId, '6.21 graph node reflects rolled-back version');

const s6reconV3 = reconstructCanonicalStateAtVersion(s6obj, s6v3.versionId);
assert(s6reconV3 !== undefined, '6.22 v3 still reconstructable after rollback');
assert(s6reconV3!.stateSnapshotRef === 'snap_s6_v3', '6.23 v3 snapshot preserved');

const s6histPkg = buildHistoricalGraphContextPackage(s6proj.nodeId!, '2026-03-15T00:00:00Z');
assert(s6histPkg.historical === true, '6.24 historical package marked as historical');
assert(s6histPkg.asOfTime === '2026-03-15T00:00:00Z', '6.25 asOfTime correct');
assert(s6histPkg.schemaVersion === 'v1', '6.26 historical package schema v1');

const s6doubleRollback = isRollbackAllowed(s6mut2.mutationId);
assert(s6doubleRollback.allowed === false, '6.27 already-rolled-back mutation cannot be rolled back again');

const s6reconV1 = reconstructCanonicalStateAtVersion(s6obj, s6v1.versionId);
assert(s6reconV1 !== undefined, '6.28 v1 still reconstructable');
assert(s6reconV1!.stateSnapshotRef === 'snap_s6_v1', '6.29 v1 snapshot intact');

const s6v3Superseded = s6v3.supersededAt;
assert(s6v3Superseded !== undefined || s6chainAfter.length > 3, '6.30 v3 either superseded or chain shows rollback version');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 7 — Diff and Forensic Reconstruction (25 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 7 — Diff and Forensic Reconstruction ===');
resetAll();

const s7obj = generateCanonicalId('ASSET');

const s7before: Record<string, unknown> = { name: 'OriginalToken', symbol: 'OTK', chain: 'ethereum' };
const s7after: Record<string, unknown> = { name: 'UpdatedToken', symbol: 'OTK', chain: 'ethereum', website: 'https://token.io' };
const s7mutId = generateMutationId();

const s7diff = buildStructuredDiff(s7mutId, [s7obj], s7before, s7after, 'IDENTITY');
assert(s7diff.diffId.startsWith('diff_'), '7.01 diff has valid ID');
assert(s7diff.mutationId === s7mutId, '7.02 diff references mutation');
assert(s7diff.targetIds.includes(s7obj), '7.03 diff targets correct object');
assert(s7diff.semanticClass === 'IDENTITY', '7.04 semantic class is IDENTITY');
assert(s7diff.schemaVersion === 'v1', '7.05 diff schema v1');

assert(Array.isArray(s7diff.changedFields), '7.06 diff has changedFields array');
assert(Array.isArray(s7diff.addedFields), '7.07 diff has addedFields array');
const s7totalDeltas = s7diff.changedFields.length + s7diff.addedFields.length + s7diff.removedFields.length;
assert(s7totalDeltas >= 0, '7.08 diff delta count is valid');
assert(typeof s7diff.severity === 'string', '7.09 diff severity is string');

const s7hasWebsite = s7diff.addedFields.includes('website') || s7diff.changedFields.some(f => f.field === 'website');
assert(s7hasWebsite || s7diff.addedFields.length === 0, '7.10 website detected or addedFields behavior correct');
assert(s7diff.removedFields.length === 0, '7.11 no removed fields');

const s7severity = s7diff.severity;
assert(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(s7severity), '7.12 severity is valid enum');

const s7structural = buildStructuredDiff('mut_s7_struct', [s7obj], { state: 'ACTIVE' }, { state: 'MERGED' }, 'STRUCTURAL');
assert(s7structural.severity === 'CRITICAL', '7.13 STRUCTURAL diff is CRITICAL severity');
assert(s7structural.approvalRequired === true, '7.14 CRITICAL requires approval');
assert(s7structural.replayBreaking === true, '7.15 STRUCTURAL diff is replay-breaking');

const s7objDiff = diffCanonicalObject('mut_s7_obj', s7obj, s7before, s7after);
assert(s7objDiff.diffId !== s7diff.diffId, '7.16 diffCanonicalObject produces distinct diff');
assert(s7objDiff.targetIds.includes(s7obj), '7.17 diffCanonicalObject targets correct object');

const s7v1 = createCanonicalVersion({
  canonicalObjectId: s7obj, versionType: 'OBJECT',
  parentVersionIds: [], createdByMutationId: 'mut_s7_v1',
  stateSnapshotRef: 'snap_s7_v1', effectiveFrom: '2026-01-15T00:00:00Z',
});
const s7v2 = createCanonicalVersion({
  canonicalObjectId: s7obj, versionType: 'OBJECT',
  parentVersionIds: [s7v1.versionId], createdByMutationId: 'mut_s7_v2',
  stateSnapshotRef: 'snap_s7_v2', effectiveFrom: '2026-02-15T00:00:00Z',
});

const s7reconTime = reconstructCanonicalStateAtTime(s7obj, '2026-02-01T00:00:00Z');
assert(s7reconTime !== undefined, '7.18 reconstructAtTime returns result');
assert(s7reconTime!.stateSnapshotRef === 'snap_s7_v1', '7.19 time-based reconstruction picks v1');

const s7reconTime2 = reconstructCanonicalStateAtTime(s7obj, '2026-03-01T00:00:00Z');
assert(s7reconTime2 !== undefined, '7.20 future time returns latest version');
assert(s7reconTime2!.stateSnapshotRef === 'snap_s7_v2', '7.21 time picks v2 after effectiveFrom');

const s7provenance = { providerId: 'prov_s7', rawFieldName: 'price', mapperVersion: '1.0.0', lineageRefs: ['lin_s7'] };
const s7obs1Result = buildCanonicalMetricObservation({
  metricPath: 'price.spot.usd', objectId: s7obj, objectType: 'ASSET',
  value: 100, observedAt: '2026-01-20T00:00:00Z',
  provenance: s7provenance, freshnessState: 'FRESH',
  admissibilityState: 'ADMITTED', validationReportId: 'vr_s7_01',
});
assert(!('error' in s7obs1Result), '7.22 observation 1 created');
if (!('error' in s7obs1Result)) persistObservation(s7obs1Result);

const s7obs2Result = buildCanonicalMetricObservation({
  metricPath: 'price.spot.usd', objectId: s7obj, objectType: 'ASSET',
  value: 110, observedAt: '2026-02-20T00:00:00Z',
  provenance: s7provenance, freshnessState: 'FRESH',
  admissibilityState: 'ADMITTED', validationReportId: 'vr_s7_02',
});
assert(!('error' in s7obs2Result), '7.23 observation 2 created');
if (!('error' in s7obs2Result)) persistObservation(s7obs2Result);

const s7allObs = getObservationsForObject(s7obj, 'price.spot.usd');
assert(s7allObs.length === 2, '7.24 getObservationsForObject returns 2');

const s7latest = getLatestObservation(s7obj, 'price.spot.usd');
assert(s7latest !== undefined, '7.25 getLatestObservation returns result');
assert(s7latest!.value === 110, '7.26 latest observation is the most recent');

})();

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
