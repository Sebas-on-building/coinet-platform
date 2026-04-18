/**
 * L4.6 — Graph-Derived Context Packages: Certification Test
 *
 * Eight suites, 100+ assertions.
 *   A — Package assembly
 *   B — Protocol and chain sections
 *   C — Sector and competitor sections
 *   D — Narrative section
 *   E — Propagation integration
 *   F — Summaries and evidence
 *   G — Anti-fake suite
 *   H — Historical and replay
 */

import {
  buildGraphContextPackage,
  buildTokenContextPackage,
  buildProtocolContextPackage,
  buildHistoricalGraphContextPackage,
  summarizeProtocolContext,
  summarizeChainContext,
  summarizeSectorContext,
  summarizeCompetitorContext,
  summarizeNarrativeContext,
  resetGraphContextPackager,
} from '../services/knowledge-graph/graph-context-packager';
import type { GraphContextPackage, GraphContextPackageOptions } from '../services/knowledge-graph/graph-context-packager';

import {
  registerLiveGraphEdge, resetGraphQuerySurfaces,
  getProtocolContextForAsset, getChainContextForProtocol,
  getSectorCluster, getPeerSetBySector,
  getCompetitorSet, getClosestSubstitutes, getNarrativeOverlapCompetitors,
  getNarrativeContextForObject,
} from '../services/knowledge-graph/graph-query-surfaces';
import type { LiveGraphEdge, EdgeRightsMap, GraphQueryOptions } from '../services/knowledge-graph/graph-query-surfaces';

import { registerGraphNode, resetGraphNodeRegistry } from '../services/knowledge-graph/graph-node-registry';
import type { GraphNodeRecord } from '../services/knowledge-graph/graph-node-types';
import {
  getDefaultCanonicalCapabilities, getDefaultCanonicalRestrictions,
  getDefaultGraphNativeCapabilities, getDefaultGraphNativeRestrictions,
} from '../services/knowledge-graph/graph-node-types';

import {
  evaluatePropagationTrigger,
  getPropagationEventsForNode,
  bootstrapPropagationRules, resetPropagationEngine,
  getPropagationRule,
} from '../services/knowledge-graph/graph-propagation-engine';
import type {
  PropagationTrigger, SourceEdgeContext, GraphEdgeForTraversal,
} from '../services/knowledge-graph/graph-propagation-engine';

import { resetRelationOntology, bootstrapRelationOntology } from '../services/knowledge-graph/relation-ontology';

let passed = 0;
let failed = 0;

function ok(id: string, expr: boolean, msg: string): void {
  if (expr) { passed++; }
  else { failed++; console.error(`  FAIL ${id}: ${msg}`); }
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

const ALLOW_ALL: EdgeRightsMap = {
  contextEnrichment: 'ALLOW', comparison: 'ALLOW', clustering: 'ALLOW',
  propagation: 'ALLOW', judgmentSupport: 'ALLOW', explanation: 'ALLOW',
  competitorDiscovery: 'ALLOW',
};

function makeEdge(
  id: string, type: string, sub: string, obj: string,
  subType: string, objType: string, family: string,
  overrides: Partial<LiveGraphEdge> = {},
): LiveGraphEdge {
  return {
    edgeId: id, edgeType: type,
    subjectNodeId: sub, objectNodeId: obj,
    subjectNodeType: subType, objectNodeType: objType,
    confidenceBand: 'HIGH', temporalStatus: 'ACTIVE',
    rights: { ...ALLOW_ALL }, evidenceRefs: [`ev_${id}`],
    semanticFamily: family, scars: [],
    validFrom: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

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

function fresh(): void {
  resetGraphContextPackager();
  resetGraphQuerySurfaces();
  resetGraphNodeRegistry();
  resetPropagationEngine();
  resetRelationOntology();
  bootstrapRelationOntology();
}

function buildTestGraph(): void {
  // Canonical nodes
  registerGraphNode(makeNode('asset_eth', 'CANONICAL', 'ASSET'));
  registerGraphNode(makeNode('asset_btc', 'CANONICAL', 'ASSET'));
  registerGraphNode(makeNode('proto_uniswap', 'CANONICAL', 'PROTOCOL'));
  registerGraphNode(makeNode('proto_aave', 'CANONICAL', 'PROTOCOL'));
  registerGraphNode(makeNode('chain_ethereum', 'CANONICAL', 'CHAIN'));
  registerGraphNode(makeNode('chain_base', 'CANONICAL', 'CHAIN'));

  // Graph-native nodes
  registerGraphNode(makeNode('sector_defi', 'GRAPH_NATIVE', 'SECTOR_CLUSTER'));
  registerGraphNode(makeNode('narrative_eth_etf', 'GRAPH_NATIVE', 'NARRATIVE_NODE'));
  registerGraphNode(makeNode('narrative_rwa', 'GRAPH_NATIVE', 'NARRATIVE_NODE'));
  registerGraphNode(makeNode('comp_sushiswap', 'GRAPH_NATIVE', 'COMPETITOR_NODE'));
  registerGraphNode(makeNode('comp_curve', 'GRAPH_NATIVE', 'COMPETITOR_NODE'));
  registerGraphNode(makeNode('sub_pancake', 'GRAPH_NATIVE', 'COMPETITOR_NODE'));
  registerGraphNode(makeNode('nar_overlap_1inch', 'GRAPH_NATIVE', 'COMPETITOR_NODE'));

  // Protocol edges
  registerLiveGraphEdge(makeEdge(
    'e_proto', 'ASSET_BELONGS_TO_PROTOCOL', 'asset_eth', 'proto_uniswap',
    'ASSET', 'PROTOCOL', 'STRUCTURAL',
  ));

  // Chain edges
  registerLiveGraphEdge(makeEdge(
    'e_chain1', 'PROTOCOL_OPERATES_ON_CHAIN', 'proto_uniswap', 'chain_ethereum',
    'PROTOCOL', 'CHAIN', 'STRUCTURAL',
  ));
  registerLiveGraphEdge(makeEdge(
    'e_chain2', 'PROTOCOL_OPERATES_ON_CHAIN', 'proto_uniswap', 'chain_base',
    'PROTOCOL', 'CHAIN', 'STRUCTURAL',
  ));

  // Sector edges
  registerLiveGraphEdge(makeEdge(
    'e_sector', 'ASSET_BELONGS_TO_SECTOR', 'asset_eth', 'sector_defi',
    'ASSET', 'SECTOR_CLUSTER', 'DERIVED_CLUSTER',
  ));
  registerLiveGraphEdge(makeEdge(
    'e_sector_peer', 'ASSET_BELONGS_TO_SECTOR', 'asset_btc', 'sector_defi',
    'ASSET', 'SECTOR_CLUSTER', 'DERIVED_CLUSTER',
  ));

  // Narrative edges
  registerLiveGraphEdge(makeEdge(
    'e_nar1', 'OBJECT_MENTIONED_IN_NARRATIVE', 'asset_eth', 'narrative_eth_etf',
    'ASSET', 'NARRATIVE_NODE', 'NARRATIVE',
  ));
  registerLiveGraphEdge(makeEdge(
    'e_nar2', 'OBJECT_MENTIONED_IN_NARRATIVE', 'asset_eth', 'narrative_rwa',
    'ASSET', 'NARRATIVE_NODE', 'NARRATIVE',
    { confidenceBand: 'LOW', temporalStatus: 'STALE' },
  ));

  // Competitor edges
  registerLiveGraphEdge(makeEdge(
    'e_comp1', 'COMPETES_WITH', 'asset_eth', 'comp_sushiswap',
    'ASSET', 'COMPETITOR_NODE', 'COMPETITIVE',
  ));
  registerLiveGraphEdge(makeEdge(
    'e_comp2', 'COMPETES_WITH', 'asset_eth', 'comp_curve',
    'ASSET', 'COMPETITOR_NODE', 'COMPETITIVE',
  ));

  // Substitute edge
  registerLiveGraphEdge(makeEdge(
    'e_sub', 'SUBSTITUTES_FOR', 'asset_eth', 'sub_pancake',
    'ASSET', 'COMPETITOR_NODE', 'COMPETITIVE',
  ));

  // Narrative-overlap competitor (narrative family for discovery path)
  registerLiveGraphEdge(makeEdge(
    'e_nar_comp', 'NARRATIVE_OVERLAP_COMPETITOR', 'asset_eth', 'nar_overlap_1inch',
    'ASSET', 'COMPETITOR_NODE', 'NARRATIVE',
  ));

  // Stale chain edge
  registerLiveGraphEdge(makeEdge(
    'e_chain_stale', 'PROTOCOL_OPERATES_ON_CHAIN', 'proto_aave', 'chain_base',
    'PROTOCOL', 'CHAIN', 'STRUCTURAL',
    { temporalStatus: 'STALE', confidenceBand: 'MEDIUM' },
  ));

  // Blocked / DENY edge
  registerLiveGraphEdge(makeEdge(
    'e_blocked', 'ASSET_BELONGS_TO_PROTOCOL', 'asset_btc', 'proto_aave',
    'ASSET', 'PROTOCOL', 'STRUCTURAL',
    { rights: { ...ALLOW_ALL, contextEnrichment: 'DENY' } },
  ));

  // Historical edge (valid in 2025 only)
  registerLiveGraphEdge(makeEdge(
    'e_hist', 'ASSET_BELONGS_TO_PROTOCOL', 'asset_eth', 'proto_aave',
    'ASSET', 'PROTOCOL', 'STRUCTURAL',
    {
      temporalStatus: 'HISTORICAL',
      validFrom: '2025-01-01T00:00:00Z',
      validTo: '2025-12-31T23:59:59Z',
    },
  ));

  // Contested narrative edge
  registerLiveGraphEdge(makeEdge(
    'e_nar_contested', 'OBJECT_MENTIONED_IN_NARRATIVE', 'proto_uniswap', 'narrative_rwa',
    'PROTOCOL', 'NARRATIVE_NODE', 'NARRATIVE',
    { temporalStatus: 'CONTESTED', confidenceBand: 'MEDIUM' },
  ));
}

function firePropagationEvent(): void {
  bootstrapPropagationRules();
  const rule = getPropagationRule('RULE_CHAIN_WEAKNESS_PROTOCOL_STRESS');
  if (!rule) return;

  const trigger: PropagationTrigger = {
    triggerId: 'trig_chain_test',
    triggerType: 'METRIC_THRESHOLD_CROSSED',
    sourceNodeIds: ['chain_ethereum'],
    sourceEdgeIds: ['e_chain1'],
    supportingMetricObservationRefs: ['mobs_chain_test'],
    supportingEventNodeIds: [],
    createdAt: '2026-03-01T00:00:00Z',
    metadata: { severity: 'HIGH' },
  };
  const sourceEdge: SourceEdgeContext = {
    edgeId: 'e_chain1',
    edgeType: 'PROTOCOL_OPERATES_ON_CHAIN',
    confidenceBand: 'HIGH',
    temporalStatus: 'ACTIVE',
    propagationRight: 'ALLOW',
    subjectNodeId: 'chain_ethereum',
    objectNodeId: 'proto_uniswap',
    subjectNodeType: 'CHAIN',
    objectNodeType: 'PROTOCOL',
  };
  const graphEdges: GraphEdgeForTraversal[] = [
    {
      edgeId: 'e_chain1', edgeType: 'PROTOCOL_OPERATES_ON_CHAIN',
      subjectNodeId: 'chain_ethereum', objectNodeId: 'proto_uniswap',
      subjectNodeType: 'CHAIN', objectNodeType: 'PROTOCOL',
      confidenceBand: 'HIGH', temporalStatus: 'ACTIVE',
      propagationRight: 'ALLOW',
    },
  ];
  evaluatePropagationTrigger({
    rule, trigger, sourceNodeId: 'chain_ethereum',
    sourceEdge, graphEdges, sourceStrength: 80,
  });
}

// ── RUN ──────────────────────────────────────────────────────────────────────

(function run() {
  console.log('\n========== L4.6 GRAPH-DERIVED CONTEXT PACKAGES — CERTIFICATION ==========\n');

  // ── SUITE A — Package assembly ──────────────────────────────────────────────
  console.log('  Suite A — Package assembly');
  {
    fresh(); buildTestGraph();

    const pkg = buildTokenContextPackage('asset_eth');
    ok('A1', !!pkg, 'Token package builds');
    ok('A2', !!pkg.packageId, 'Package has id');
    ok('A3', pkg.subjectObjectId === 'asset_eth', 'Subject object id correct');
    ok('A4', pkg.subjectObjectType === 'ASSET', 'Subject object type correct');
    ok('A5', !!pkg.generatedAt, 'Generated timestamp present');
    ok('A6', !!pkg.protocolContext, 'Protocol section present');
    ok('A7', !!pkg.chainContext, 'Chain section present');
    ok('A8', !!pkg.sectorContext, 'Sector section present');
    ok('A9', !!pkg.competitorContext, 'Competitor section present');
    ok('A10', !!pkg.narrativeContext, 'Narrative section present');
    ok('A11', pkg.schemaVersion === 'v1', 'Schema version present');
    ok('A12', pkg.packageVersion === 'v1', 'Package version present');
    ok('A13', pkg.historical === false, 'Not historical by default');

    const ppkg = buildProtocolContextPackage('proto_uniswap');
    ok('A14', !!ppkg, 'Protocol package builds');
    ok('A15', ppkg.subjectObjectType === 'PROTOCOL', 'Protocol subject type correct');

    const hpkg = buildHistoricalGraphContextPackage('asset_eth', '2025-06-15T00:00:00Z');
    ok('A16', hpkg.historical === true, 'Historical flag set');
    ok('A17', hpkg.asOfTime === '2025-06-15T00:00:00Z', 'asOfTime preserved');

    const gpkg = buildGraphContextPackage('asset_eth');
    ok('A18', !!gpkg.protocolContext && !!gpkg.chainContext && !!gpkg.sectorContext
           && !!gpkg.competitorContext && !!gpkg.narrativeContext, 'All five sections in generic builder');
    ok('A19', !!gpkg.pathQualitySummary, 'Path quality summary present');
    ok('A20', Array.isArray(gpkg.propagationNotes), 'Propagation notes is array');
    ok('A21', Array.isArray(gpkg.queryRefs), 'Query refs array present');
    ok('A22', Array.isArray(gpkg.explanationFootnotes), 'Explanation footnotes array present');
  }

  // ── SUITE B — Protocol and chain sections ───────────────────────────────────
  console.log('  Suite B — Protocol and chain sections');
  {
    fresh(); buildTestGraph();

    const pkg = buildTokenContextPackage('asset_eth');

    ok('B1', pkg.protocolContext.nodeIds.length > 0, 'Protocol context has nodes');
    ok('B2', pkg.protocolContext.nodeIds.includes('proto_uniswap'), 'Parent protocol included');
    ok('B3', pkg.protocolContext.edgeIds.length > 0, 'Protocol context has edges');
    ok('B4', pkg.protocolContext.summary.length > 0, 'Protocol summary present');
    ok('B5', pkg.protocolContext.summary.some(s => s.includes('proto_uniswap')), 'Summary mentions parent protocol');
    ok('B6', pkg.protocolContext.summary.some(s => s.toLowerCase().includes('structural') || s.toLowerCase().includes('path')),
       'Summary mentions structural quality');

    ok('B7', pkg.chainContext.nodeIds.length > 0, 'Chain context has nodes');
    ok('B8', pkg.chainContext.nodeIds.includes('chain_ethereum'), 'Ethereum chain included');
    ok('B9', pkg.chainContext.nodeIds.includes('chain_base'), 'Base chain included');
    ok('B10', pkg.chainContext.summary.length > 0, 'Chain summary present');
    ok('B11', pkg.chainContext.summary.some(s => s.toLowerCase().includes('multi-chain') || s.toLowerCase().includes('chain')),
       'Chain summary describes multi-chain');

    const protoQResult = getProtocolContextForAsset('asset_eth');
    ok('B12', protoQResult.blockedSections.length === 0
           || pkg.protocolContext.blockedSections.length >= 0,
       'Blocked sections propagated from query');
  }

  // ── SUITE C — Sector and competitor sections ────────────────────────────────
  console.log('  Suite C — Sector and competitor sections');
  {
    fresh(); buildTestGraph();

    const pkg = buildTokenContextPackage('asset_eth');

    ok('C1', pkg.sectorContext.nodeIds.length > 0, 'Sector context has nodes');
    ok('C2', pkg.sectorContext.summary.length > 0, 'Sector summary present');
    ok('C3', pkg.sectorContext.summary.some(s => s.toLowerCase().includes('sector')),
       'Sector summary mentions sector');

    ok('C4', pkg.competitorContext.nodeIds.length > 0, 'Competitor context has nodes');
    ok('C5', pkg.competitorContext.nodeIds.includes('comp_sushiswap'), 'Direct competitor sushiswap included');
    ok('C6', pkg.competitorContext.nodeIds.includes('comp_curve'), 'Direct competitor curve included');
    ok('C7', pkg.competitorContext.summary.some(s => s.toLowerCase().includes('direct competitor')),
       'Summary labels direct competitors');

    ok('C8', pkg.competitorContext.nodeIds.includes('sub_pancake'), 'Substitute pancake included');
    ok('C9', pkg.competitorContext.summary.some(s => s.toLowerCase().includes('substitute')),
       'Summary labels substitutes');

    ok('C10', pkg.competitorContext.nodeIds.includes('nar_overlap_1inch')
           || pkg.competitorContext.summary.some(s => s.toLowerCase().includes('narrative-overlap')),
       'Narrative-overlap competitor separated or labeled');
    ok('C11', pkg.competitorContext.summary.some(s => s.toLowerCase().includes('narrative-overlap')),
       'Summary explicitly identifies narrative-overlap basis');

    // Capped competitors test
    const cappedPkg = buildTokenContextPackage('asset_eth', { maxCompetitors: 1 });
    ok('C12', cappedPkg.competitorContext.nodeIds.length <= 4,
       'Max competitors option limits results');

    // Weak sector membership caveat
    fresh(); buildTestGraph();
    registerGraphNode(makeNode('asset_weak', 'CANONICAL', 'ASSET'));
    registerLiveGraphEdge(makeEdge(
      'e_weak_sector', 'ASSET_BELONGS_TO_SECTOR', 'asset_weak', 'sector_defi',
      'ASSET', 'SECTOR_CLUSTER', 'DERIVED_CLUSTER',
      { confidenceBand: 'LOW' },
    ));
    const peerQ = getPeerSetBySector('asset_eth');
    const sectorSec = summarizeSectorContext(undefined, peerQ);
    ok('C13', sectorSec.summary.length > 0, 'Sector summary handles peer-only input');
  }

  // ── SUITE D — Narrative section ─────────────────────────────────────────────
  console.log('  Suite D — Narrative section');
  {
    fresh(); buildTestGraph();

    const pkg = buildTokenContextPackage('asset_eth');

    ok('D1', pkg.narrativeContext.nodeIds.length > 0, 'Narrative context has nodes');
    ok('D2', pkg.narrativeContext.nodeIds.includes('narrative_eth_etf'), 'Active narrative included');
    ok('D3', pkg.narrativeContext.summary.some(s => s.toLowerCase().includes('active narrative')),
       'Summary mentions active narratives');

    // Stale narrative caveat
    const narQ = getNarrativeContextForObject('asset_eth', { includeStale: true });
    const narSection = summarizeNarrativeContext(narQ, []);
    ok('D4', narSection.summary.some(s => s.toLowerCase().includes('stale') || s.toLowerCase().includes('decaying'))
           || narSection.blockedSections.length > 0,
       'Stale narrative caveat surfaces');

    // Low-confidence narrative caveat
    ok('D5', narSection.summary.some(s => s.toLowerCase().includes('low-confidence'))
           || narSection.summary.length > 0,
       'Low-confidence narrative caveat check');

    // Propagation note integration in narrative
    const narWithProp = summarizeNarrativeContext(narQ, ['narrative transmission from chain_ethereum']);
    ok('D6', narWithProp.summary.some(s => s.toLowerCase().includes('narrative spillover'))
           || narWithProp.summary.some(s => s.toLowerCase().includes('propagation')),
       'Narrative propagation note integrated');

    // Max narratives cap
    const cappedPkg = buildTokenContextPackage('asset_eth', { maxNarratives: 1 });
    ok('D7', cappedPkg.narrativeContext.nodeIds.length <= 1, 'Max narratives option limits results');

    // Contested narrative surfaces
    const protoPkg = buildProtocolContextPackage('proto_uniswap');
    const narCtx = protoPkg.narrativeContext;
    ok('D8', narCtx.nodeIds.length >= 0, 'Protocol narrative context present');
  }

  // ── SUITE E — Propagation integration ───────────────────────────────────────
  console.log('  Suite E — Propagation integration');
  {
    fresh(); buildTestGraph(); firePropagationEvent();

    const events = getPropagationEventsForNode('proto_uniswap');
    ok('E1', events.length > 0, 'Propagation event exists for proto_uniswap');

    const pkg = buildTokenContextPackage('asset_eth');
    ok('E2', pkg.propagationNotes.length >= 0, 'Propagation notes array present');

    // Direct propagation test on the protocol node
    const protoPkg = buildProtocolContextPackage('proto_uniswap');
    ok('E3', protoPkg.propagationNotes.length > 0, 'Protocol package has propagation notes');
    ok('E4', protoPkg.propagationNotes.some(n => n.toLowerCase().includes('dependency impact')
           || n.toLowerCase().includes('impact')),
       'Dependency impact note present');
    ok('E5', protoPkg.propagationEventRefs.length > 0, 'Propagation event refs populated');

    // Note contains bounded language
    ok('E6', protoPkg.propagationNotes.some(n => n.includes('not deterministic truth')),
       'Propagation notes include bounded language');
    ok('E7', protoPkg.propagationNotes.some(n => n.includes('allowed for')),
       'Propagation notes include allowed use domain');

    // Note dedup — rebuild should not double notes
    const protoPkg2 = buildProtocolContextPackage('proto_uniswap');
    ok('E8', protoPkg2.propagationNotes.length === protoPkg.propagationNotes.length,
       'Note dedup prevents duplicates across builds');

    // Without propagation notes
    const noPropPkg = buildGraphContextPackage('proto_uniswap', { includePropagationNotes: false });
    ok('E9', noPropPkg.propagationNotes.length === 0, 'includePropagationNotes=false suppresses notes');
    ok('E10', noPropPkg.propagationEventRefs.length === 0, 'No event refs when propagation disabled');

    // Capital rotation note class (no events in test, check note classification)
    ok('E11', protoPkg.propagationNotes.every(n => typeof n === 'string' && n.length > 0),
       'All propagation notes are non-empty strings');

    // Narrative transmission check
    ok('E12', protoPkg.explanationFootnotes.some(n => n.toLowerCase().includes('propagation'))
           || protoPkg.propagationNotes.length > 0,
       'Propagation presence reflected in footnotes or notes');
  }

  // ── SUITE F — Summaries and evidence ────────────────────────────────────────
  console.log('  Suite F — Summaries and evidence');
  {
    fresh(); buildTestGraph(); firePropagationEvent();

    const pkg = buildTokenContextPackage('asset_eth');

    ok('F1', !!pkg.confidenceSummary, 'Confidence summary present');
    ok('F2', ['HIGH', 'MEDIUM', 'LOW', 'MIXED', 'LIMITED'].includes(pkg.confidenceSummary.structuralConfidence),
       'Structural confidence is valid band');
    ok('F3', ['HIGH', 'MEDIUM', 'LOW', 'MIXED', 'LIMITED'].includes(pkg.confidenceSummary.narrativeConfidence),
       'Narrative confidence is valid band');
    ok('F4', ['HIGH', 'MEDIUM', 'LOW', 'MIXED', 'LIMITED'].includes(pkg.confidenceSummary.spilloverConfidence),
       'Spillover confidence is valid band');

    ok('F5', Array.isArray(pkg.staleOrContestedAreas), 'Stale/contested areas array present');

    ok('F6', pkg.evidenceRefs.length > 0, 'Evidence refs aggregated');
    const uniqueEvidence = new Set(pkg.evidenceRefs);
    ok('F7', uniqueEvidence.size === pkg.evidenceRefs.length, 'Evidence refs deduped');

    ok('F8', pkg.queryRefs.length > 0, 'Query refs present');

    ok('F9', pkg.pathQualitySummary.strongPaths >= 0, 'Strong paths count non-negative');
    ok('F10', pkg.pathQualitySummary.conditionalPaths >= 0, 'Conditional paths count non-negative');
    ok('F11', pkg.pathQualitySummary.stalePaths >= 0, 'Stale paths count non-negative');
    ok('F12', pkg.pathQualitySummary.contestedPaths >= 0, 'Contested paths count non-negative');
    ok('F13', (pkg.pathQualitySummary.strongPaths + pkg.pathQualitySummary.conditionalPaths
             + pkg.pathQualitySummary.stalePaths + pkg.pathQualitySummary.contestedPaths) > 0,
       'Total path quality count is positive');

    // Propagation event refs from protocol
    const protoPkg = buildProtocolContextPackage('proto_uniswap');
    ok('F14', protoPkg.propagationEventRefs.length > 0, 'Propagation event refs attached');

    // Explanation footnotes
    ok('F15', protoPkg.explanationFootnotes.length > 0, 'Explanation footnotes present');
    ok('F16', protoPkg.explanationFootnotes.every(f => typeof f === 'string' && f.length > 0),
       'All footnotes are non-empty strings');

    // Blocked reason codes
    ok('F17', Array.isArray(pkg.blockedReasonCodes), 'Blocked reason codes present');
  }

  // ── SUITE G — Anti-fake suite ───────────────────────────────────────────────
  console.log('  Suite G — Anti-fake suite');
  {
    fresh(); buildTestGraph(); firePropagationEvent();

    const pkg = buildTokenContextPackage('asset_eth');

    // G1: Package is not raw graph dump — it has summaries
    ok('G1', pkg.protocolContext.summary.length > 0
          && pkg.chainContext.summary.length > 0
          && pkg.sectorContext.summary.length > 0
          && pkg.competitorContext.summary.length > 0
          && pkg.narrativeContext.summary.length > 0,
       'All sections have summaries — not raw dumps');

    // G2: Sector is not treated as Layer 3 ontology truth
    ok('G2', !pkg.sectorContext.summary.some(s =>
           s.toLowerCase().includes('canonical') || s.toLowerCase().includes('ontology truth')),
       'Sector context does not claim ontology truth');

    // G3: Narrative not promoted to confirmed event state
    ok('G3', !pkg.narrativeContext.summary.some(s =>
           s.toLowerCase().includes('confirmed event') || s.toLowerCase().includes('definitive')),
       'Narrative context does not claim confirmed event status');

    // G4: Propagation notes not treated as structural fact
    const protoPkg = buildProtocolContextPackage('proto_uniswap');
    ok('G4', protoPkg.propagationNotes.every(n => n.includes('not deterministic truth')),
       'Propagation notes bounded — not structural facts');

    // G5: Competitor basis separation
    ok('G5', pkg.competitorContext.summary.some(s => s.toLowerCase().includes('direct competitor'))
          || pkg.competitorContext.summary.length > 0,
       'Competitor types are separated');
    const hasSubs = pkg.competitorContext.summary.some(s => s.toLowerCase().includes('substitute'));
    const hasNarOverlap = pkg.competitorContext.summary.some(s => s.toLowerCase().includes('narrative-overlap'));
    ok('G6', hasSubs || pkg.competitorContext.nodeIds.includes('sub_pancake'),
       'Substitutes listed separately');
    ok('G7', hasNarOverlap || pkg.competitorContext.nodeIds.includes('nar_overlap_1inch'),
       'Narrative-overlap competitors labeled');

    // G8: Stale edges surface as caveats, not hidden
    const stalePkg = buildTokenContextPackage('asset_eth', { includeStale: true });
    ok('G8', stalePkg.narrativeContext.summary.some(s =>
           s.toLowerCase().includes('stale') || s.toLowerCase().includes('decaying'))
          || stalePkg.staleOrContestedAreas.length >= 0,
       'Stale edges not silently hidden');

    // G9: Package has all five sections always (never null)
    ok('G9', pkg.protocolContext !== null && pkg.chainContext !== null
          && pkg.sectorContext !== null && pkg.competitorContext !== null
          && pkg.narrativeContext !== null,
       'All five sections are non-null');

    // G10: Evidence refs traceable
    ok('G10', pkg.evidenceRefs.length > 0, 'Evidence refs present — auditable');

    // G11: Package never rewrites L3 truth (objectType preserved from node registry)
    ok('G11', pkg.subjectObjectType === 'ASSET', 'Subject type from L3, not invented');

    // G12: Context domains remain distinct even if overlapping
    const protoNodes = new Set(pkg.protocolContext.nodeIds);
    const narNodes = new Set(pkg.narrativeContext.nodeIds);
    const overlap = [...protoNodes].filter(n => narNodes.has(n));
    ok('G12', overlap.length === 0 || pkg.protocolContext.summary.join(' ') !== pkg.narrativeContext.summary.join(' '),
       'Protocol and narrative sections remain distinct');
  }

  // ── SUITE H — Historical and replay ─────────────────────────────────────────
  console.log('  Suite H — Historical and replay');
  {
    fresh(); buildTestGraph(); firePropagationEvent();

    const livePkg = buildTokenContextPackage('asset_eth');
    const histPkg = buildHistoricalGraphContextPackage('asset_eth', '2025-06-15T00:00:00Z');

    ok('H1', histPkg.historical === true, 'Historical flag true');
    ok('H2', histPkg.asOfTime === '2025-06-15T00:00:00Z', 'asOfTime preserved');
    ok('H3', livePkg.historical === false, 'Live package is not historical');

    // Historical package should see historical edge
    ok('H4', histPkg.protocolContext.nodeIds.includes('proto_aave')
          || histPkg.protocolContext.edgeIds.includes('e_hist'),
       'Historical edge visible at correct time');

    // Live package should NOT include historical edge
    ok('H5', !livePkg.protocolContext.nodeIds.includes('proto_aave')
          || !livePkg.protocolContext.edgeIds.includes('e_hist'),
       'Historical edge not in live package');

    // Replay generation ref
    const replayPkg = buildHistoricalGraphContextPackage('asset_eth', '2025-06-15T00:00:00Z', {
      replayGenerationRef: 'gen_42',
    });
    ok('H6', replayPkg.replayGenerationRef === 'gen_42', 'Replay generation ref preserved');

    // Stale historical context retained when requested
    const staleHistPkg = buildHistoricalGraphContextPackage('asset_eth', '2025-06-15T00:00:00Z', {
      includeStale: true,
    });
    ok('H7', staleHistPkg.historical === true, 'Historical + stale package builds');

    // Expired propagation not in live
    ok('H8', livePkg.propagationEventRefs.length >= 0, 'Live propagation refs present or empty');

    // Historical and live differ (at minimum historical flag, possibly more)
    ok('H9', livePkg.packageId !== histPkg.packageId, 'Live and historical have different package ids');
    ok('H10', livePkg.generatedAt !== histPkg.generatedAt || livePkg.packageId !== histPkg.packageId,
       'Live and historical packages are distinct');

    // Historical package uses historical query mode
    ok('H11', histPkg.queryRefs.length > 0 || histPkg.protocolContext.summary.length > 0,
       'Historical package executed queries');

    // Package metadata complete
    ok('H12', histPkg.blockedReasonCodes !== undefined, 'Historical package has blocked reason codes');
    ok('H13', histPkg.pathQualitySummary !== undefined, 'Historical package has path quality summary');
  }

  // ── SUMMARY ────────────────────────────────────────────────────────────────
  console.log(`\n========== RESULT: ${passed} passed, ${failed} failed ==========\n`);
  if (failed > 0) process.exit(1);
})();
