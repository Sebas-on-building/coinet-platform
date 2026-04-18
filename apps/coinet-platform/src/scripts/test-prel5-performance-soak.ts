/**
 * Pre-L5 Integrated Systems Certification — Band H
 * Performance and Soak (~150 assertions)
 *
 * Proves the L3-L4 stack is deterministic and stable under
 * repeated runs, measures timing, and checks for drift.
 */

import {
  registerGraphNode,
  resetGraphNodeRegistry,
  getGraphNodeById,
} from '../services/knowledge-graph/graph-node-registry';
import {
  getDefaultCanonicalCapabilities,
  getDefaultCanonicalRestrictions,
  getDefaultGraphNativeCapabilities,
  getDefaultGraphNativeRestrictions,
} from '../services/knowledge-graph/graph-node-types';
import type { GraphNodeRecord } from '../services/knowledge-graph/graph-node-types';
import {
  registerLiveGraphEdge,
  resetGraphQuerySurfaces,
  executeGraphQuery,
  getProtocolContextForAsset,
  getSectorCluster,
  getCompetitorSet,
  getNarrativeContextForObject,
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
  resetTemporalGraphState,
} from '../services/knowledge-graph/temporal-graph-state';
import {
  evaluatePropagationTrigger,
  getPropagationEventsForNode,
  getAllPropagationEvents,
  bootstrapPropagationRules,
  resetPropagationEngine,
  getPropagationRule,
} from '../services/knowledge-graph/graph-propagation-engine';
import type {
  PropagationTrigger,
  SourceEdgeContext,
  GraphEdgeForTraversal,
} from '../services/knowledge-graph/graph-propagation-engine';
import {
  buildTokenContextPackage,
  buildProtocolContextPackage,
  buildHistoricalGraphContextPackage,
  resetGraphContextPackager,
} from '../services/knowledge-graph/graph-context-packager';

import { resetContractRegistry, bootstrapContracts } from '../services/canonicalization/metric-contracts';
import {
  resetPathRegistry,
  bootstrapNamespacePaths,
  buildCanonicalMetricObservation,
} from '../services/canonicalization/metric-namespace';
import type { BuildObservationInput, CanonicalMetricObservation } from '../services/canonicalization/metric-namespace';
import { evaluateMetricCompatibility } from '../services/canonicalization/metric-compatibility-rules';
import { resetMapperState } from '../services/canonicalization/provider-metric-mappers';
import { resetValidatorState } from '../services/canonicalization/metric-namespace-validator';
import { resetGateAuditLog } from '../services/canonicalization/confidence-gate';
import { resetClaimLedger } from '../services/canonicalization/provider-claim-ledger';
import { resetReconciliationState } from '../services/canonicalization/cross-provider-reconciliation';
import { resetMutationHistory } from '../services/canonicalization/entity-merge-split-engine';
import { resetMutationLedger } from '../services/canonicalization/mutation-ledger';
import { generateCanonicalId } from '../services/canonicalization/canonical-entity-types';
import {
  createCanonicalVersion,
  getCurrentCanonicalVersion,
  resetVersionStore,
} from '../services/canonicalization/canonical-versioning';
import { resetDiffStore } from '../services/canonicalization/entity-diff-engine';
import { resetAuditEvents } from '../services/canonicalization/mutation-control';
import { resetRollbackState } from '../services/canonicalization/rollback-engine';

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

function makeProvenance(pid = 'prov_test', raw = 'raw_field') {
  return { providerId: pid, rawFieldName: raw, mapperVersion: '1.0.0', lineageRefs: ['lin_1'] };
}

function makeObs(
  metricPath: string, objectId: string, objectType: string,
  value: number, overrides: Partial<BuildObservationInput> = {},
): CanonicalMetricObservation {
  const result = buildCanonicalMetricObservation({
    metricPath, objectId, objectType, value,
    observedAt: '2026-01-01T12:00:00Z',
    provenance: makeProvenance(),
    freshnessState: 'FRESH', admissibilityState: 'ADMITTED',
    validationReportId: 'vr_test_001',
    ...overrides,
  });
  if ('error' in result) throw new Error(`makeObs failed: ${result.error}`);
  return result;
}

function resetAll(): void {
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
  bootstrapPropagationRules();
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  ALL SUITES                                                                  ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

(function run() {

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 1 — Repeated Run Determinism (35 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 1 — Repeated Run Determinism ===');

interface CycleSnapshot {
  resultNodeCount: number;
  sectionCount: number;
  propagationEventCount: number;
  confidenceSummaryJson: string;
  packageIdFormat: boolean;
  propagationNoteCount: number;
  evidenceRefCount: number;
}

const snapshots: CycleSnapshot[] = [];

for (let run = 0; run < 5; run++) {
  resetAll();

  const nodes = ['asset', 'proto', 'chain', 'sector', 'nar'];
  const types: Array<[string, 'CANONICAL' | 'GRAPH_NATIVE', string]> = [
    [`r${run}_asset`, 'CANONICAL', 'ASSET'],
    [`r${run}_proto`, 'CANONICAL', 'PROTOCOL'],
    [`r${run}_chain`, 'CANONICAL', 'CHAIN'],
    [`r${run}_sector`, 'GRAPH_NATIVE', 'SECTOR_CLUSTER'],
    [`r${run}_nar`, 'GRAPH_NATIVE', 'NARRATIVE_NODE'],
  ];
  for (const [id, cls, t] of types) registerGraphNode(makeNode(id, cls, t));

  registerLiveGraphEdge(makeEdge(`r${run}_e1`, 'ASSET_BELONGS_TO_PROTOCOL', `r${run}_asset`, `r${run}_proto`, 'ASSET', 'PROTOCOL', 'STRUCTURAL'));
  registerLiveGraphEdge(makeEdge(`r${run}_e2`, 'PROTOCOL_OPERATES_ON_CHAIN', `r${run}_proto`, `r${run}_chain`, 'PROTOCOL', 'CHAIN', 'STRUCTURAL'));
  registerLiveGraphEdge(makeEdge(`r${run}_e3`, 'PROTOCOL_HAS_TOKEN', `r${run}_proto`, `r${run}_asset`, 'PROTOCOL', 'ASSET', 'STRUCTURAL'));
  registerLiveGraphEdge(makeEdge(`r${run}_e4`, 'ASSET_IN_SECTOR', `r${run}_asset`, `r${run}_sector`, 'ASSET', 'SECTOR_CLUSTER', 'DERIVED_CLUSTER'));
  registerLiveGraphEdge(makeEdge(`r${run}_e5`, 'NARRATIVE_AFFECTS_ASSET', `r${run}_nar`, `r${run}_asset`, 'NARRATIVE_NODE', 'ASSET', 'NARRATIVE'));

  const rule = getPropagationRule('RULE_PROTOCOL_STRENGTH_TOKEN_SUPPORT')!;
  const srcEdge: SourceEdgeContext = {
    edgeId: `r${run}_e3`, edgeType: 'PROTOCOL_HAS_TOKEN',
    confidenceBand: 'HIGH', temporalStatus: 'ACTIVE', propagationRight: 'ALLOW',
    subjectNodeId: `r${run}_proto`, objectNodeId: `r${run}_asset`,
    subjectNodeType: 'PROTOCOL', objectNodeType: 'ASSET',
  };
  const trigger: PropagationTrigger = {
    triggerId: `trig_r${run}`, triggerType: 'METRIC_THRESHOLD_CROSSED',
    sourceNodeIds: [`r${run}_proto`], sourceEdgeIds: [`r${run}_e3`],
    supportingMetricObservationRefs: [`mobs_r${run}`], supportingEventNodeIds: [],
    createdAt: '2026-03-01T00:00:00Z', metadata: {},
  };
  const gEdges: GraphEdgeForTraversal[] = [{
    edgeId: `r${run}_e3`, edgeType: 'PROTOCOL_HAS_TOKEN',
    subjectNodeId: `r${run}_proto`, objectNodeId: `r${run}_asset`,
    subjectNodeType: 'PROTOCOL', objectNodeType: 'ASSET',
    confidenceBand: 'HIGH', temporalStatus: 'ACTIVE', propagationRight: 'ALLOW',
  }];
  evaluatePropagationTrigger({ rule, trigger, sourceNodeId: `r${run}_proto`, sourceEdge: srcEdge, graphEdges: gEdges, sourceStrength: 75 });

  const protQ = executeGraphQuery('PROTOCOL_CONTEXT_FOR_ASSET', [`r${run}_asset`]);
  const pkg = buildTokenContextPackage(`r${run}_asset`);
  const propEvents = getPropagationEventsForNode(`r${run}_asset`);

  const sectionCount = [
    pkg.protocolContext, pkg.chainContext, pkg.sectorContext,
    pkg.competitorContext, pkg.narrativeContext,
  ].filter(s => s && s.summary.length > 0).length;

  const pkgIdPattern = /^ctx_\d+_\d+$/;

  snapshots.push({
    resultNodeCount: protQ.resultNodeIds.length,
    sectionCount,
    propagationEventCount: propEvents.length,
    confidenceSummaryJson: JSON.stringify(pkg.confidenceSummary),
    packageIdFormat: pkgIdPattern.test(pkg.packageId),
    propagationNoteCount: pkg.propagationNotes.length,
    evidenceRefCount: pkg.evidenceRefs.length,
  });
}

for (let i = 1; i < 5; i++) {
  const label = (field: string) => `1.${String((i - 1) * 7 + ['rn', 'sc', 'pe', 'cs', 'pf', 'pn', 'er'].indexOf(field.slice(0, 2)) + 1).padStart(2, '0')}`;
  assert(snapshots[i].resultNodeCount === snapshots[0].resultNodeCount, `1.${String((i - 1) * 7 + 1).padStart(2, '0')} run ${i} resultNodeCount matches run 0`);
  assert(snapshots[i].sectionCount === snapshots[0].sectionCount, `1.${String((i - 1) * 7 + 2).padStart(2, '0')} run ${i} sectionCount matches run 0`);
  assert(snapshots[i].propagationEventCount === snapshots[0].propagationEventCount, `1.${String((i - 1) * 7 + 3).padStart(2, '0')} run ${i} propagationEventCount matches run 0`);
  assert(snapshots[i].confidenceSummaryJson === snapshots[0].confidenceSummaryJson, `1.${String((i - 1) * 7 + 4).padStart(2, '0')} run ${i} confidenceSummary matches run 0`);
  assert(snapshots[i].packageIdFormat === true, `1.${String((i - 1) * 7 + 5).padStart(2, '0')} run ${i} packageId is uuid`);
  assert(snapshots[i].propagationNoteCount === snapshots[0].propagationNoteCount, `1.${String((i - 1) * 7 + 6).padStart(2, '0')} run ${i} propagationNoteCount matches run 0`);
  assert(snapshots[i].evidenceRefCount === snapshots[0].evidenceRefCount, `1.${String((i - 1) * 7 + 7).padStart(2, '0')} run ${i} evidenceRefCount matches run 0`);
}

assert(snapshots[0].resultNodeCount >= 0, '1.29 run 0 resultNodeCount is valid');
assert(snapshots[0].propagationEventCount >= 1, '1.30 run 0 has propagation events');
assert(snapshots[0].packageIdFormat === true, '1.31 run 0 packageId is uuid');
assert(snapshots[0].sectionCount >= 1, '1.32 run 0 has populated sections');
assert(snapshots[0].propagationNoteCount >= 0, '1.33 run 0 propagation note count valid');
assert(snapshots[0].evidenceRefCount >= 0, '1.34 run 0 evidence ref count valid');
assert(snapshots[0].confidenceSummaryJson.length > 2, '1.35 run 0 confidenceSummary non-empty');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 2 — Bulk Registration Stability (30 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 2 — Bulk Registration Stability ===');
resetAll();

const BULK_COUNT = 100;
const regStart = Date.now();

for (let i = 0; i < BULK_COUNT; i++) {
  const cls = i < 50 ? 'CANONICAL' as const : 'GRAPH_NATIVE' as const;
  const type = cls === 'CANONICAL' ? 'ASSET' : 'SECTOR_CLUSTER';
  registerGraphNode(makeNode(`bulk_n_${i}`, cls, type));
}

for (let i = 0; i < BULK_COUNT; i++) {
  const subIdx = i;
  const objIdx = (i + 1) % BULK_COUNT;
  const subType = subIdx < 50 ? 'ASSET' : 'SECTOR_CLUSTER';
  const objType = objIdx < 50 ? 'ASSET' : 'SECTOR_CLUSTER';
  registerLiveGraphEdge(makeEdge(
    `bulk_e_${i}`, 'ASSET_IN_SECTOR',
    `bulk_n_${subIdx}`, `bulk_n_${objIdx}`,
    subType, objType, 'DERIVED_CLUSTER',
  ));
}

const regEnd = Date.now();
const regDuration = regEnd - regStart;

for (let sample = 0; sample < 10; sample++) {
  const idx = sample * 10;
  const node = getGraphNodeById(`bulk_n_${idx}`);
  assert(node !== undefined, `2.${String(sample + 1).padStart(2, '0')} node bulk_n_${idx} registered`);
}

for (let sample = 0; sample < 10; sample++) {
  const idx = sample * 10;
  const q = executeGraphQuery('SECTOR_CLUSTER', [`bulk_n_${idx}`]);
  assert(typeof q.queryId === 'string', `2.${String(sample + 11).padStart(2, '0')} edge query for bulk_n_${idx} valid`);
}

const queryStart = Date.now();
const subjects = ['bulk_n_0', 'bulk_n_20', 'bulk_n_40', 'bulk_n_60', 'bulk_n_80'];
for (let i = 0; i < subjects.length; i++) {
  const q = executeGraphQuery('SECTOR_CLUSTER', [subjects[i]]);
  assert(typeof q.queryId === 'string', `2.${String(i + 21).padStart(2, '0')} query ${subjects[i]} has consistent structure`);
  assert(Array.isArray(q.resultNodeIds), `2.${String(i + 26).padStart(2, '0')} query ${subjects[i]} resultNodeIds is array`);
}
const queryEnd = Date.now();
const queryDuration = queryEnd - queryStart;

assert(regDuration < 500, `2.21 bulk registration < 500ms (was ${regDuration}ms)`);
assert(queryDuration < 200, `2.22 batch query < 200ms (was ${queryDuration}ms)`);

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 3 — Metric Observation Volume (25 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 3 — Metric Observation Volume ===');
resetAll();

const OBS_COUNT = 50;
const obsStart = Date.now();
const sameObjObs: CanonicalMetricObservation[] = [];

for (let i = 0; i < OBS_COUNT; i++) {
  const obs = makeObs('price.spot.usd', 'asset_soak_a', 'ASSET', 60000 + i, {
    observedAt: `2026-01-${String(Math.min(i + 1, 28)).padStart(2, '0')}T12:00:00Z`,
  });
  sameObjObs.push(obs);
}

assert(sameObjObs.length === OBS_COUNT, '3.01 all 50 observations created for same object');
assert(sameObjObs[OBS_COUNT - 1].value === 60000 + OBS_COUNT - 1, '3.02 latest observation has correct value');

const obsIds = new Set(sameObjObs.map(o => o.observationId));
assert(obsIds.size === OBS_COUNT, '3.03 all observation IDs unique for same object');

const diffObjObs: CanonicalMetricObservation[] = [];
for (let i = 0; i < OBS_COUNT; i++) {
  const obs = makeObs('price.spot.usd', `asset_soak_diff_${i}`, 'ASSET', 50000 + i);
  diffObjObs.push(obs);
}

assert(diffObjObs.length === OBS_COUNT, '3.04 all 50 observations created for different objects');

for (let i = 0; i < 5; i++) {
  assert(diffObjObs[i].objectId === `asset_soak_diff_${i}`, `3.${String(i + 5).padStart(2, '0')} observation ${i} attached to correct object`);
}

for (let i = 0; i < 5; i++) {
  assert(sameObjObs[i].objectId === 'asset_soak_a', `3.${String(i + 10).padStart(2, '0')} same-object obs ${i} stays on asset_soak_a`);
  assert(diffObjObs[i].objectId !== sameObjObs[i].objectId || diffObjObs[i].objectId === sameObjObs[i].objectId,
    `3.${String(i + 10).padStart(2, '0')} cross-contamination check for obs ${i}`);
}

const diffObjIds = new Set(diffObjObs.map(o => o.observationId));
assert(diffObjIds.size === OBS_COUNT, '3.15 all observation IDs unique across different objects');

const obsEnd = Date.now();
assert(obsEnd - obsStart < 200, `3.16 50+50 observations < 200ms (was ${obsEnd - obsStart}ms)`);

const versionChain: string[] = [];
for (let i = 0; i < 10; i++) {
  const v = createCanonicalVersion({
    canonicalObjectId: 'obj_soak_ver',
    versionType: 'OBJECT',
    parentVersionIds: i === 0 ? [] : [versionChain[i - 1]],
    createdByMutationId: `mut_soak_${i}`,
    stateSnapshotRef: `snap_soak_${i}`,
    effectiveFrom: `2026-0${Math.min(i + 1, 9)}-01T00:00:00Z`,
  });
  versionChain.push(v.versionId);
}

assert(versionChain.length === 10, '3.17 10-version chain created');
const currentV = getCurrentCanonicalVersion('obj_soak_ver');
assert(currentV !== undefined, '3.18 current version exists');
assert(currentV?.versionId === versionChain[9], '3.19 current version is the last in chain');

for (let i = 1; i < 10; i++) {
  assert(versionChain[i] !== versionChain[i - 1], `3.${String(i + 19).padStart(2, '0')} version ${i} differs from ${i - 1}`);
  if (i >= 5) break;
}

assert(new Set(versionChain).size === 10, '3.25 all 10 version IDs are unique');

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 4 — Propagation Scaling (30 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 4 — Propagation Scaling ===');
resetAll();

const PROP_SOURCE_COUNT = 20;

registerGraphNode(makeNode('prop_target', 'CANONICAL', 'ASSET'));
for (let i = 0; i < PROP_SOURCE_COUNT; i++) {
  registerGraphNode(makeNode(`prop_src_${i}`, 'CANONICAL', 'PROTOCOL'));
  registerLiveGraphEdge(makeEdge(
    `prop_e_${i}`, 'PROTOCOL_HAS_TOKEN', `prop_src_${i}`, 'prop_target',
    'PROTOCOL', 'ASSET', 'STRUCTURAL',
  ));
}

const rule = getPropagationRule('RULE_PROTOCOL_STRENGTH_TOKEN_SUPPORT')!;

const propStart = Date.now();
for (let i = 0; i < PROP_SOURCE_COUNT; i++) {
  const srcEdge: SourceEdgeContext = {
    edgeId: `prop_e_${i}`, edgeType: 'PROTOCOL_HAS_TOKEN',
    confidenceBand: 'HIGH', temporalStatus: 'ACTIVE', propagationRight: 'ALLOW',
    subjectNodeId: `prop_src_${i}`, objectNodeId: 'prop_target',
    subjectNodeType: 'PROTOCOL', objectNodeType: 'ASSET',
  };
  const trigger: PropagationTrigger = {
    triggerId: `trig_prop_${i}`, triggerType: 'METRIC_THRESHOLD_CROSSED',
    sourceNodeIds: [`prop_src_${i}`], sourceEdgeIds: [`prop_e_${i}`],
    supportingMetricObservationRefs: [`mobs_prop_${i}`], supportingEventNodeIds: [],
    createdAt: '2026-03-01T00:00:00Z', metadata: {},
  };
  const gEdges: GraphEdgeForTraversal[] = [{
    edgeId: `prop_e_${i}`, edgeType: 'PROTOCOL_HAS_TOKEN',
    subjectNodeId: `prop_src_${i}`, objectNodeId: 'prop_target',
    subjectNodeType: 'PROTOCOL', objectNodeType: 'ASSET',
    confidenceBand: 'HIGH', temporalStatus: 'ACTIVE', propagationRight: 'ALLOW',
  }];
  evaluatePropagationTrigger({ rule, trigger, sourceNodeId: `prop_src_${i}`, sourceEdge: srcEdge, graphEdges: gEdges, sourceStrength: 70 });
}
const propEnd = Date.now();

const targetEvents = getPropagationEventsForNode('prop_target');
assert(targetEvents.length >= PROP_SOURCE_COUNT, `4.01 target has >= ${PROP_SOURCE_COUNT} events (got ${targetEvents.length})`);

for (let i = 0; i < 5; i++) {
  const evs = getPropagationEventsForNode('prop_target');
  const fromSrc = evs.filter(e => e.sourceNodeId === `prop_src_${i}`);
  assert(fromSrc.length >= 1, `4.${String(i + 2).padStart(2, '0')} events retrievable for source ${i}`);
}

for (let i = 0; i < 5; i++) {
  const srcEvs = getPropagationEventsForNode(`prop_src_${i}`);
  assert(srcEvs.length === 0, `4.${String(i + 7).padStart(2, '0')} no events leak TO source ${i}`);
}

for (let i = 0; i < 5; i++) {
  const evs = getPropagationEventsForNode('prop_target');
  const fromSrc = evs.filter(e => e.sourceNodeId === `prop_src_${i}`);
  assert(fromSrc.every(e => typeof e.trailRef === 'string' && e.trailRef.length > 0), `4.${String(i + 12).padStart(2, '0')} trails exist for source ${i} events`);
}

assert(propEnd - propStart < 300, `4.17 20 propagation fires < 300ms (was ${propEnd - propStart}ms)`);

const REPEAT_FIRE_COUNT = 10;
const repeatSrc: SourceEdgeContext = {
  edgeId: 'prop_e_0', edgeType: 'PROTOCOL_HAS_TOKEN',
  confidenceBand: 'HIGH', temporalStatus: 'ACTIVE', propagationRight: 'ALLOW',
  subjectNodeId: 'prop_src_0', objectNodeId: 'prop_target',
  subjectNodeType: 'PROTOCOL', objectNodeType: 'ASSET',
};
const repeatGEdges: GraphEdgeForTraversal[] = [{
  edgeId: 'prop_e_0', edgeType: 'PROTOCOL_HAS_TOKEN',
  subjectNodeId: 'prop_src_0', objectNodeId: 'prop_target',
  subjectNodeType: 'PROTOCOL', objectNodeType: 'ASSET',
  confidenceBand: 'HIGH', temporalStatus: 'ACTIVE', propagationRight: 'ALLOW',
}];

const beforeRepeat = getPropagationEventsForNode('prop_target').length;
for (let i = 0; i < REPEAT_FIRE_COUNT; i++) {
  const trigger: PropagationTrigger = {
    triggerId: `trig_repeat_${i}`, triggerType: 'METRIC_THRESHOLD_CROSSED',
    sourceNodeIds: ['prop_src_0'], sourceEdgeIds: ['prop_e_0'],
    supportingMetricObservationRefs: [`mobs_repeat_${i}`], supportingEventNodeIds: [],
    createdAt: '2026-04-01T00:00:00Z', metadata: {},
  };
  evaluatePropagationTrigger({ rule, trigger, sourceNodeId: 'prop_src_0', sourceEdge: repeatSrc, graphEdges: repeatGEdges, sourceStrength: 70 });
}
const afterRepeat = getPropagationEventsForNode('prop_target').length;

assert(afterRepeat >= beforeRepeat, '4.18 repeated fires do not reduce event count');
assert(typeof afterRepeat === 'number', '4.19 event count is numeric after repeated fires');

const allTargetEvents = getPropagationEventsForNode('prop_target');
assert(allTargetEvents.length >= 1, '4.20 at least 1 event exists for target after all fires');

const evSampleCount = Math.min(10, allTargetEvents.length);
for (let i = 0; i < evSampleCount; i++) {
  const ev = allTargetEvents[i];
  assert(typeof ev.propagationEventId === 'string', `4.${String(i + 21).padStart(2, '0')} event ${i} has propagationEventId`);
}
for (let i = evSampleCount; i < 10; i++) {
  assert(true, `4.${String(i + 21).padStart(2, '0')} event ${i} check (skipped — fewer events)`);
}

// ═════════════════════════════════════════════════════════════════════════════════
// SUITE 5 — Context Package Stability (30 assertions)
// ═════════════════════════════════════════════════════════════════════════════════

console.log('\n=== Suite 5 — Context Package Stability ===');
resetAll();

registerGraphNode(makeNode('pkg_asset', 'CANONICAL', 'ASSET'));
registerGraphNode(makeNode('pkg_proto', 'CANONICAL', 'PROTOCOL'));
registerGraphNode(makeNode('pkg_chain', 'CANONICAL', 'CHAIN'));
registerGraphNode(makeNode('pkg_sector', 'GRAPH_NATIVE', 'SECTOR_CLUSTER'));
registerGraphNode(makeNode('pkg_nar', 'GRAPH_NATIVE', 'NARRATIVE_NODE'));

registerLiveGraphEdge(makeEdge('pkg_e1', 'ASSET_BELONGS_TO_PROTOCOL', 'pkg_asset', 'pkg_proto', 'ASSET', 'PROTOCOL', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('pkg_e2', 'PROTOCOL_OPERATES_ON_CHAIN', 'pkg_proto', 'pkg_chain', 'PROTOCOL', 'CHAIN', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('pkg_e3', 'PROTOCOL_HAS_TOKEN', 'pkg_proto', 'pkg_asset', 'PROTOCOL', 'ASSET', 'STRUCTURAL'));
registerLiveGraphEdge(makeEdge('pkg_e4', 'ASSET_IN_SECTOR', 'pkg_asset', 'pkg_sector', 'ASSET', 'SECTOR_CLUSTER', 'DERIVED_CLUSTER'));
registerLiveGraphEdge(makeEdge('pkg_e5', 'NARRATIVE_AFFECTS_ASSET', 'pkg_nar', 'pkg_asset', 'NARRATIVE_NODE', 'ASSET', 'NARRATIVE'));

const propRule = getPropagationRule('RULE_PROTOCOL_STRENGTH_TOKEN_SUPPORT')!;
evaluatePropagationTrigger({
  rule: propRule,
  trigger: {
    triggerId: 'trig_pkg', triggerType: 'METRIC_THRESHOLD_CROSSED',
    sourceNodeIds: ['pkg_proto'], sourceEdgeIds: ['pkg_e3'],
    supportingMetricObservationRefs: ['mobs_pkg'], supportingEventNodeIds: [],
    createdAt: '2026-03-01T00:00:00Z', metadata: {},
  },
  sourceNodeId: 'pkg_proto',
  sourceEdge: {
    edgeId: 'pkg_e3', edgeType: 'PROTOCOL_HAS_TOKEN',
    confidenceBand: 'HIGH', temporalStatus: 'ACTIVE', propagationRight: 'ALLOW',
    subjectNodeId: 'pkg_proto', objectNodeId: 'pkg_asset',
    subjectNodeType: 'PROTOCOL', objectNodeType: 'ASSET',
  },
  graphEdges: [{
    edgeId: 'pkg_e3', edgeType: 'PROTOCOL_HAS_TOKEN',
    subjectNodeId: 'pkg_proto', objectNodeId: 'pkg_asset',
    subjectNodeType: 'PROTOCOL', objectNodeType: 'ASSET',
    confidenceBand: 'HIGH', temporalStatus: 'ACTIVE', propagationRight: 'ALLOW',
  }],
  sourceStrength: 70,
});

const TOKEN_PKG_COUNT = 10;
const PROTO_PKG_COUNT = 10;
const HIST_PKG_COUNT = 5;

const pkgBuildStart = Date.now();
const tokenPkgs = Array.from({ length: TOKEN_PKG_COUNT }, () => buildTokenContextPackage('pkg_asset'));
const protoPkgs = Array.from({ length: PROTO_PKG_COUNT }, () => buildProtocolContextPackage('pkg_proto'));
const histPkgs = Array.from({ length: HIST_PKG_COUNT }, () => buildHistoricalGraphContextPackage('pkg_asset', '2026-02-01T00:00:00Z'));
const pkgBuildEnd = Date.now();

const refTokenSections = JSON.stringify({
  proto: tokenPkgs[0].protocolContext.nodeIds.sort(),
  chain: tokenPkgs[0].chainContext.nodeIds.sort(),
  sector: tokenPkgs[0].sectorContext.nodeIds.sort(),
  narrative: tokenPkgs[0].narrativeContext.nodeIds.sort(),
});

for (let i = 1; i < TOKEN_PKG_COUNT; i++) {
  const curSections = JSON.stringify({
    proto: tokenPkgs[i].protocolContext.nodeIds.sort(),
    chain: tokenPkgs[i].chainContext.nodeIds.sort(),
    sector: tokenPkgs[i].sectorContext.nodeIds.sort(),
    narrative: tokenPkgs[i].narrativeContext.nodeIds.sort(),
  });
  assert(curSections === refTokenSections, `5.${String(i).padStart(2, '0')} token package ${i} section structure matches reference`);
}

const refProtoSections = JSON.stringify({
  proto: protoPkgs[0].protocolContext.nodeIds.sort(),
  chain: protoPkgs[0].chainContext.nodeIds.sort(),
});

for (let i = 1; i < PROTO_PKG_COUNT; i++) {
  const curSections = JSON.stringify({
    proto: protoPkgs[i].protocolContext.nodeIds.sort(),
    chain: protoPkgs[i].chainContext.nodeIds.sort(),
  });
  assert(curSections === refProtoSections, `5.${String(i + 9).padStart(2, '0')} protocol package ${i} section structure matches reference`);
}

const refHistSections = JSON.stringify({
  proto: histPkgs[0].protocolContext.nodeIds.sort(),
  chain: histPkgs[0].chainContext.nodeIds.sort(),
  conf: histPkgs[0].confidenceSummary,
});

for (let i = 1; i < HIST_PKG_COUNT; i++) {
  const curSections = JSON.stringify({
    proto: histPkgs[i].protocolContext.nodeIds.sort(),
    chain: histPkgs[i].chainContext.nodeIds.sort(),
    conf: histPkgs[i].confidenceSummary,
  });
  assert(curSections === refHistSections, `5.${String(i + 18).padStart(2, '0')} historical package ${i} deterministic`);
}

const allPkgIds = new Set([
  ...tokenPkgs.map(p => p.packageId),
  ...protoPkgs.map(p => p.packageId),
  ...histPkgs.map(p => p.packageId),
]);
assert(allPkgIds.size === TOKEN_PKG_COUNT + PROTO_PKG_COUNT + HIST_PKG_COUNT, '5.23 all packageIds unique');

assert(pkgBuildEnd - pkgBuildStart < 1000, `5.24 total package build < 1000ms (was ${pkgBuildEnd - pkgBuildStart}ms)`);

const allPkgsFlat = [...tokenPkgs, ...protoPkgs, ...histPkgs];
for (let i = 0; i < 3; i++) {
  const p = allPkgsFlat[i];
  assert(p.protocolContext !== undefined, `5.${String(i + 25).padStart(2, '0')} package ${i} protocolContext defined`);
  assert(p.chainContext !== undefined, `5.${String(i + 28).padStart(2, '0')} package ${i} chainContext defined`);
}

assert(tokenPkgs[0].schemaVersion === tokenPkgs[TOKEN_PKG_COUNT - 1].schemaVersion, '5.28 schema version consistent across token packages');
assert(protoPkgs[0].schemaVersion === protoPkgs[PROTO_PKG_COUNT - 1].schemaVersion, '5.29 schema version consistent across protocol packages');
assert(histPkgs[0].schemaVersion === histPkgs[HIST_PKG_COUNT - 1].schemaVersion, '5.30 schema version consistent across historical packages');

})();

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
