/**
 * L4.6 — Graph-Derived Context Packages
 *
 * Turns governed graph intelligence into judgment-ready relational
 * context. A context package is not a raw graph dump — it is a bounded,
 * confidence-aware summary with explicit uncertainty and relevance
 * boundaries.
 *
 * Eight sections:
 *   1. Type declarations
 *   2. Subject resolution & query intake
 *   3. Domain assemblers (protocol, chain, sector, competitor, narrative)
 *   4. Propagation integration
 *   5. Summary engine
 *   6. Dedup and coherence pass
 *   7. Public package APIs
 *   8. Reset
 */

import { getGraphNodeById } from './graph-node-registry';
import {
  getProtocolContextForAsset, getChainContextForProtocol,
  getNarrativeContextForObject, getPeerSetBySector,
  getSectorCluster, getEcosystemCluster,
  getCompetitorSet, getClosestSubstitutes, getNarrativeOverlapCompetitors,
  getPeerSetByProtocol,
  executeHistoricalGraphQuery,
} from './graph-query-surfaces';
import type { GraphQueryResult, GraphQueryOptions } from './graph-query-surfaces';
import {
  getPropagationEventsForNode,
  getActivePropagationForNodeAtTime,
} from './graph-propagation-engine';
import type { PropagationEvent } from './graph-propagation-engine';

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 1 — TYPE DECLARATIONS                                               ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

export type PackageConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'MIXED' | 'LIMITED';

export interface ContextSection {
  nodeIds: string[];
  edgeIds: string[];
  summary: string[];
  blockedSections: string[];
}

export interface GraphContextPackage {
  packageId: string;
  subjectObjectId: string;
  subjectObjectType: string;
  generatedAt: string;
  protocolContext: ContextSection;
  chainContext: ContextSection;
  sectorContext: ContextSection;
  competitorContext: ContextSection;
  narrativeContext: ContextSection;
  propagationNotes: string[];
  confidenceSummary: {
    structuralConfidence: PackageConfidenceLevel;
    narrativeConfidence: PackageConfidenceLevel;
    spilloverConfidence: PackageConfidenceLevel;
  };
  staleOrContestedAreas: string[];
  evidenceRefs: string[];
  packageVersion: string;
  replayGenerationRef?: string;
  asOfTime?: string;
  historical: boolean;
  blockedReasonCodes: string[];
  pathQualitySummary: {
    strongPaths: number;
    conditionalPaths: number;
    stalePaths: number;
    contestedPaths: number;
  };
  propagationEventRefs: string[];
  queryRefs: string[];
  explanationFootnotes: string[];
  schemaVersion: string;
}

export interface GraphContextPackageOptions {
  asOfTime?: string;
  replayGenerationRef?: string;
  includeStale?: boolean;
  includeHistorical?: boolean;
  includeConditional?: boolean;
  includePropagationNotes?: boolean;
  maxCompetitors?: number;
  maxSectorPeers?: number;
  maxNarratives?: number;
  maxProtocolDependencies?: number;
  summaryVerbosity?: 'COMPACT' | 'STANDARD' | 'DETAILED';
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 2 — SUBJECT RESOLUTION & QUERY INTAKE                               ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

interface SubjectInfo {
  objectId: string;
  objectType: string;
  nodeId: string;
  resolved: boolean;
}

function resolveSubject(objectId: string): SubjectInfo {
  const node = getGraphNodeById(objectId);
  return {
    objectId,
    objectType: node?.canonicalNodeType ?? node?.nativeNodeType ?? 'UNKNOWN',
    nodeId: objectId,
    resolved: !!node,
  };
}

function queryOpts(opts?: GraphContextPackageOptions): GraphQueryOptions {
  return {
    asOfTime: opts?.asOfTime,
    replayGenerationRef: opts?.replayGenerationRef,
    includeStale: opts?.includeStale,
    includeHistorical: opts?.includeHistorical,
    allowConditionalOnly: opts?.includeConditional,
  };
}

function historicalQueryOpts(asOfTime: string, opts?: GraphContextPackageOptions): GraphQueryOptions {
  return {
    asOfTime,
    replayGenerationRef: opts?.replayGenerationRef,
    includeStale: true,
    includeHistorical: true,
    allowConditionalOnly: true,
  };
}

interface QueryBank {
  protocolQ?: GraphQueryResult;
  chainQ?: GraphQueryResult;
  sectorQ?: GraphQueryResult;
  peerSectorQ?: GraphQueryResult;
  competitorQ?: GraphQueryResult;
  substitutesQ?: GraphQueryResult;
  narOverlapQ?: GraphQueryResult;
  narrativeQ?: GraphQueryResult;
  peerProtoQ?: GraphQueryResult;
}

function loadQueries(subjectId: string, subjectType: string, qOpts: GraphQueryOptions): QueryBank {
  const bank: QueryBank = {};

  if (subjectType === 'ASSET' || subjectType === 'UNKNOWN') {
    bank.protocolQ = getProtocolContextForAsset(subjectId, qOpts);
    bank.sectorQ = getSectorCluster(subjectId, qOpts);
    bank.peerSectorQ = getPeerSetBySector(subjectId, qOpts);
    bank.narrativeQ = getNarrativeContextForObject(subjectId, qOpts);
    bank.competitorQ = getCompetitorSet(subjectId, qOpts);
    bank.substitutesQ = getClosestSubstitutes(subjectId, qOpts);
    bank.narOverlapQ = getNarrativeOverlapCompetitors(subjectId, qOpts);
  }

  if (subjectType === 'PROTOCOL') {
    bank.peerProtoQ = getPeerSetByProtocol(subjectId, qOpts);
    bank.narrativeQ = getNarrativeContextForObject(subjectId, qOpts);
    bank.competitorQ = getCompetitorSet(subjectId, qOpts);
    bank.substitutesQ = getClosestSubstitutes(subjectId, qOpts);
  }

  const protocolNodeId = bank.protocolQ?.resultNodeIds[0];
  if (protocolNodeId) {
    bank.chainQ = getChainContextForProtocol(protocolNodeId, qOpts);
  }
  if (subjectType === 'PROTOCOL') {
    bank.chainQ = getChainContextForProtocol(subjectId, qOpts);
  }

  return bank;
}

function loadHistoricalQueries(subjectId: string, subjectType: string, asOfTime: string, opts?: GraphContextPackageOptions): QueryBank {
  return loadQueries(subjectId, subjectType, historicalQueryOpts(asOfTime, opts));
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 3 — DOMAIN ASSEMBLERS                                               ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

function emptySection(): ContextSection {
  return { nodeIds: [], edgeIds: [], summary: [], blockedSections: [] };
}

function limit<T>(arr: T[], max?: number): T[] {
  return max && arr.length > max ? arr.slice(0, max) : arr;
}

export function summarizeProtocolContext(q: GraphQueryResult | undefined, subjectId: string): ContextSection {
  if (!q || q.resultNodeIds.length === 0) {
    return { ...emptySection(), summary: [`No protocol context found for ${subjectId}`] };
  }
  const protocols = q.resultNodeIds.filter(n => n !== subjectId);
  const section: ContextSection = {
    nodeIds: protocols,
    edgeIds: q.traversedEdgeIds,
    summary: [],
    blockedSections: [...q.blockedSections],
  };

  const parentProto = protocols[0];
  if (parentProto) section.summary.push(`Parent protocol: ${parentProto}`);

  const highPaths = q.pathSummaries.filter(p => p.strongestEdgeBand === 'HIGH').length;
  const totalPaths = q.pathSummaries.length;
  if (totalPaths > 0) {
    section.summary.push(`Structural path quality: ${highPaths}/${totalPaths} strong`);
  }

  if (q.blockedSections.length > 0) {
    section.summary.push(`${q.blockedSections.length} blocked or pruned structural sections`);
  }

  return section;
}

export function summarizeChainContext(q: GraphQueryResult | undefined, protocolNodeId: string | undefined): ContextSection {
  if (!q || q.resultNodeIds.length === 0) {
    return { ...emptySection(), summary: ['No chain context available'] };
  }
  const chains = q.resultNodeIds.filter(n => n !== protocolNodeId);
  const section: ContextSection = {
    nodeIds: chains,
    edgeIds: q.traversedEdgeIds,
    summary: [],
    blockedSections: [...q.blockedSections],
  };

  if (chains.length === 1) section.summary.push(`Single-chain dependency: ${chains[0]}`);
  else if (chains.length > 1) section.summary.push(`Multi-chain: ${chains.join(', ')} (concentration risk noted)`);

  const stalePaths = q.pathSummaries.filter(p => p.containsStaleEdge);
  if (stalePaths.length > 0) {
    section.summary.push(`${stalePaths.length} chain path(s) contain stale edges`);
  }

  return section;
}

export function summarizeSectorContext(
  sectorQ: GraphQueryResult | undefined,
  peerQ: GraphQueryResult | undefined,
  maxPeers?: number,
): ContextSection {
  const section = emptySection();
  if (sectorQ && sectorQ.resultNodeIds.length > 0) {
    section.nodeIds.push(...sectorQ.resultNodeIds);
    section.edgeIds.push(...sectorQ.traversedEdgeIds);
    section.blockedSections.push(...sectorQ.blockedSections);
    section.summary.push(`Sector cluster: ${sectorQ.resultNodeIds[0]}`);
  }
  if (peerQ && peerQ.resultNodeIds.length > 0) {
    const peers = limit(peerQ.resultNodeIds, maxPeers);
    for (const p of peers) {
      if (!section.nodeIds.includes(p)) section.nodeIds.push(p);
    }
    section.edgeIds.push(...peerQ.traversedEdgeIds.filter(e => !section.edgeIds.includes(e)));
    section.blockedSections.push(...peerQ.blockedSections);
    section.summary.push(`Sector peers: ${peers.length}`);

    const weakPeers = peerQ.pathSummaries.filter(p => p.weakestEdgeBand === 'LOW' || p.weakestEdgeBand === 'UNRESOLVED');
    if (weakPeers.length > 0) {
      section.summary.push(`${weakPeers.length} peer path(s) have weak membership edges (caveated)`);
    }
  }
  if (section.summary.length === 0) section.summary.push('No sector context available');
  return section;
}

export function summarizeCompetitorContext(
  compQ: GraphQueryResult | undefined,
  subsQ: GraphQueryResult | undefined,
  narOverlapQ: GraphQueryResult | undefined,
  maxCompetitors?: number,
): ContextSection {
  const section = emptySection();

  if (compQ && compQ.resultNodeIds.length > 0) {
    const direct = limit(compQ.resultNodeIds, maxCompetitors);
    section.nodeIds.push(...direct);
    section.edgeIds.push(...compQ.traversedEdgeIds);
    section.blockedSections.push(...compQ.blockedSections);
    section.summary.push(`Direct competitors: ${direct.join(', ')}`);
  }
  if (subsQ && subsQ.resultNodeIds.length > 0) {
    const subs = subsQ.resultNodeIds.filter(n => !section.nodeIds.includes(n));
    for (const s of limit(subs, maxCompetitors)) section.nodeIds.push(s);
    section.edgeIds.push(...subsQ.traversedEdgeIds.filter(e => !section.edgeIds.includes(e)));
    if (subs.length > 0) section.summary.push(`Substitutes: ${limit(subs, maxCompetitors).join(', ')}`);
  }
  if (narOverlapQ && narOverlapQ.resultNodeIds.length > 0) {
    const overlap = narOverlapQ.resultNodeIds.filter(n => !section.nodeIds.includes(n));
    for (const o of limit(overlap, maxCompetitors)) section.nodeIds.push(o);
    if (overlap.length > 0) {
      section.summary.push(`Narrative-overlap competitors: ${limit(overlap, maxCompetitors).join(', ')} (basis: shared narrative edges, not structural)`);
    }
  }

  if (section.summary.length === 0) section.summary.push('No competitor context available');
  return section;
}

export function summarizeNarrativeContext(
  q: GraphQueryResult | undefined,
  propNotes: string[],
  maxNarratives?: number,
): ContextSection {
  if (!q || q.resultNodeIds.length === 0) {
    return { ...emptySection(), summary: ['No active narrative context'] };
  }
  const narratives = limit(q.resultNodeIds, maxNarratives);
  const section: ContextSection = {
    nodeIds: narratives,
    edgeIds: q.traversedEdgeIds,
    summary: [],
    blockedSections: [...q.blockedSections],
  };

  section.summary.push(`Active narratives: ${narratives.join(', ')}`);

  const stalePaths = q.pathSummaries.filter(p => p.containsStaleEdge);
  if (stalePaths.length > 0) {
    section.summary.push(`${stalePaths.length} narrative path(s) are stale or decaying — caution advised`);
  }

  const weakPaths = q.pathSummaries.filter(p => p.weakestEdgeBand === 'LOW' || p.weakestEdgeBand === 'UNRESOLVED');
  if (weakPaths.length > 0) {
    section.summary.push(`${weakPaths.length} narrative link(s) are low-confidence`);
  }

  const narPropNotes = propNotes.filter(n => n.toLowerCase().includes('narrative'));
  if (narPropNotes.length > 0) {
    section.summary.push(`Narrative spillover active: ${narPropNotes.length} propagation note(s)`);
  }

  return section;
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 4 — PROPAGATION INTEGRATION                                         ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

const EFFECT_CLASS_LABELS: Record<string, string> = {
  DEPENDENCY_IMPACT: 'dependency impact',
  EXPOSURE_SPILLOVER: 'exposure spillover',
  COMPETITIVE_PRESSURE: 'competitive pressure',
  NARRATIVE_TRANSMISSION: 'narrative transmission',
  CAPITAL_ROTATION: 'capital rotation',
  FLOAT_PRESSURE: 'float pressure',
  SECURITY_CONTAGION: 'security contagion',
};

function buildPropagationNotes(
  subjectId: string,
  asOfTime?: string,
): { notes: string[]; eventRefs: string[] } {
  const events: readonly PropagationEvent[] = asOfTime
    ? getActivePropagationForNodeAtTime(subjectId, asOfTime)
    : getPropagationEventsForNode(subjectId);

  const notes: string[] = [];
  const eventRefs: string[] = [];
  const seen = new Set<string>();

  for (const ev of events) {
    const label = EFFECT_CLASS_LABELS[ev.effectClass] ?? ev.effectClass;
    const key = `${ev.effectClass}:${ev.sourceNodeId}`;
    if (seen.has(key)) continue;
    seen.add(key);

    eventRefs.push(ev.propagationEventId);
    const bandNote = ev.confidenceBand === 'HIGH' ? 'high-confidence'
      : ev.confidenceBand === 'MEDIUM' ? 'moderate-confidence' : 'low-confidence';
    notes.push(
      `${label} from ${ev.sourceNodeId} (${bandNote}, strength ${ev.strengthScore}); ` +
      `allowed for ${ev.allowedUses.join(', ')}; not deterministic truth`,
    );
  }

  return { notes, eventRefs };
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 5 — SUMMARY ENGINE                                                  ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

function deriveConfidenceLevel(q: GraphQueryResult | undefined): PackageConfidenceLevel {
  if (!q || q.traversedEdgeIds.length === 0) return 'LIMITED';
  const s = q.confidenceSummary;
  const total = s.high + s.medium + s.low + s.unresolved;
  if (total === 0) return 'LIMITED';
  if (s.high / total >= 0.6) return 'HIGH';
  if ((s.high + s.medium) / total >= 0.6) return 'MEDIUM';
  if (s.low + s.unresolved > s.high + s.medium) return 'LOW';
  return 'MIXED';
}

function buildPathQuality(queries: (GraphQueryResult | undefined)[]): GraphContextPackage['pathQualitySummary'] {
  const pq = { strongPaths: 0, conditionalPaths: 0, stalePaths: 0, contestedPaths: 0 };
  for (const q of queries) {
    if (!q) continue;
    for (const p of q.pathSummaries) {
      if (p.strongestEdgeBand === 'HIGH' && !p.containsStaleEdge && !p.containsContestedEdge) pq.strongPaths++;
      else if (p.containsStaleEdge) pq.stalePaths++;
      else if (p.containsContestedEdge) pq.contestedPaths++;
      else pq.conditionalPaths++;
    }
  }
  return pq;
}

function collectStaleOrContested(queries: (GraphQueryResult | undefined)[]): string[] {
  const areas: string[] = [];
  for (const q of queries) {
    if (!q) continue;
    for (const p of q.pathSummaries) {
      if (p.containsStaleEdge) areas.push(`Stale path to ${p.targetNodeId}`);
      if (p.containsContestedEdge) areas.push(`Contested path to ${p.targetNodeId}`);
    }
    for (const b of q.blockedSections) {
      if (b.includes('TEMPORAL') || b.includes('CONFIDENCE')) {
        areas.push(b);
      }
    }
  }
  return [...new Set(areas)];
}

function aggregateEvidence(queries: (GraphQueryResult | undefined)[]): string[] {
  const refs = new Set<string>();
  for (const q of queries) {
    if (!q) continue;
    for (const r of q.evidenceRefs) refs.add(r);
  }
  return [...refs];
}

function aggregateBlockedReasons(queries: (GraphQueryResult | undefined)[]): string[] {
  const codes = new Set<string>();
  for (const q of queries) {
    if (!q) continue;
    for (const c of q.blockedReasonCodes) codes.add(c);
  }
  return [...codes];
}

function aggregateQueryRefs(queries: (GraphQueryResult | undefined)[]): string[] {
  return queries.filter(Boolean).map(q => q!.queryId);
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 6 — DEDUP AND COHERENCE PASS                                        ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

function dedup(pkg: GraphContextPackage): void {
  const allNotes = new Set<string>();
  pkg.explanationFootnotes = pkg.explanationFootnotes.filter(n => {
    if (allNotes.has(n)) return false;
    allNotes.add(n);
    return true;
  });

  const allPropNotes = new Set<string>();
  pkg.propagationNotes = pkg.propagationNotes.filter(n => {
    if (allPropNotes.has(n)) return false;
    allPropNotes.add(n);
    return true;
  });

  pkg.staleOrContestedAreas = [...new Set(pkg.staleOrContestedAreas)];
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 7 — PUBLIC PACKAGE APIs                                             ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

let _pkgCounter = 0;

function assemblePackage(
  subject: SubjectInfo,
  bank: QueryBank,
  propResult: { notes: string[]; eventRefs: string[] },
  opts?: GraphContextPackageOptions,
): GraphContextPackage {
  const protocolSection = summarizeProtocolContext(bank.protocolQ, subject.objectId);
  const parentProto = bank.protocolQ?.resultNodeIds.find(n => n !== subject.objectId);
  const chainSection = summarizeChainContext(bank.chainQ, parentProto ?? subject.objectId);
  const sectorSection = summarizeSectorContext(bank.sectorQ, bank.peerSectorQ, opts?.maxSectorPeers);
  const compSection = summarizeCompetitorContext(
    bank.competitorQ ?? bank.peerProtoQ, bank.substitutesQ, bank.narOverlapQ, opts?.maxCompetitors,
  );
  const narSection = summarizeNarrativeContext(bank.narrativeQ, propResult.notes, opts?.maxNarratives);

  const allQueries: (GraphQueryResult | undefined)[] = [
    bank.protocolQ, bank.chainQ, bank.sectorQ, bank.peerSectorQ,
    bank.competitorQ, bank.substitutesQ, bank.narOverlapQ, bank.narrativeQ,
    bank.peerProtoQ,
  ];

  const footnotes: string[] = [];
  if (protocolSection.blockedSections.length > 0)
    footnotes.push(`Protocol context has ${protocolSection.blockedSections.length} blocked section(s)`);
  if (narSection.blockedSections.length > 0)
    footnotes.push(`Narrative context has ${narSection.blockedSections.length} blocked section(s)`);
  if (propResult.notes.length > 0)
    footnotes.push('Propagation notes are bounded contextual effects, not structural truth');

  const spilloverQ = allQueries.find(q => q?.queryType === 'SPILLOVER_FROM_EVENT');

  _pkgCounter++;
  const pkg: GraphContextPackage = {
    packageId: `ctx_${_pkgCounter}_${Date.now()}`,
    subjectObjectId: subject.objectId,
    subjectObjectType: subject.objectType,
    generatedAt: new Date().toISOString(),
    protocolContext: protocolSection,
    chainContext: chainSection,
    sectorContext: sectorSection,
    competitorContext: compSection,
    narrativeContext: narSection,
    propagationNotes: propResult.notes,
    confidenceSummary: {
      structuralConfidence: deriveConfidenceLevel(bank.protocolQ),
      narrativeConfidence: deriveConfidenceLevel(bank.narrativeQ),
      spilloverConfidence: propResult.eventRefs.length > 0
        ? deriveConfidenceLevel(spilloverQ) === 'LIMITED' ? 'MEDIUM' : deriveConfidenceLevel(spilloverQ)
        : 'LIMITED',
    },
    staleOrContestedAreas: collectStaleOrContested(allQueries),
    evidenceRefs: aggregateEvidence(allQueries),
    packageVersion: 'v1',
    replayGenerationRef: opts?.replayGenerationRef,
    asOfTime: opts?.asOfTime,
    historical: !!opts?.asOfTime,
    blockedReasonCodes: aggregateBlockedReasons(allQueries),
    pathQualitySummary: buildPathQuality(allQueries),
    propagationEventRefs: propResult.eventRefs,
    queryRefs: aggregateQueryRefs(allQueries),
    explanationFootnotes: footnotes,
    schemaVersion: 'v1',
  };

  dedup(pkg);
  return pkg;
}

export function buildGraphContextPackage(
  subjectObjectId: string, opts?: GraphContextPackageOptions,
): GraphContextPackage {
  const subject = resolveSubject(subjectObjectId);
  const qOpts = queryOpts(opts);
  const bank = loadQueries(subject.objectId, subject.objectType, qOpts);
  const includeProp = opts?.includePropagationNotes !== false;
  const propResult = includeProp
    ? buildPropagationNotes(subject.objectId, opts?.asOfTime)
    : { notes: [], eventRefs: [] };
  return assemblePackage(subject, bank, propResult, opts);
}

export function buildTokenContextPackage(
  assetId: string, opts?: GraphContextPackageOptions,
): GraphContextPackage {
  const subject = resolveSubject(assetId);
  const effectiveType = subject.objectType === 'UNKNOWN' ? 'ASSET' : subject.objectType;
  const qOpts = queryOpts(opts);
  const bank = loadQueries(subject.objectId, effectiveType, qOpts);
  const propResult = buildPropagationNotes(subject.objectId, opts?.asOfTime);
  return assemblePackage({ ...subject, objectType: effectiveType }, bank, propResult, opts);
}

export function buildProtocolContextPackage(
  protocolId: string, opts?: GraphContextPackageOptions,
): GraphContextPackage {
  const subject = resolveSubject(protocolId);
  const effectiveType = 'PROTOCOL';
  const qOpts = queryOpts(opts);
  const bank = loadQueries(subject.objectId, effectiveType, qOpts);
  const propResult = buildPropagationNotes(subject.objectId, opts?.asOfTime);
  return assemblePackage({ ...subject, objectType: effectiveType }, bank, propResult, opts);
}

export function buildHistoricalGraphContextPackage(
  subjectObjectId: string, asOfTime: string, opts?: GraphContextPackageOptions,
): GraphContextPackage {
  const subject = resolveSubject(subjectObjectId);
  const bank = loadHistoricalQueries(subject.objectId, subject.objectType, asOfTime, opts);
  const propResult = buildPropagationNotes(subject.objectId, asOfTime);
  return assemblePackage(subject, bank, propResult, { ...opts, asOfTime });
}

// ╔═══════════════════════════════════════════════════════════════════════════════╗
// ║  SECTION 8 — RESET                                                           ║
// ╚═══════════════════════════════════════════════════════════════════════════════╝

export function resetGraphContextPackager(): void {
  _pkgCounter = 0;
}
