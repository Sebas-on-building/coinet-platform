/**
 * L4.2 — Edge Confidence and Evidence Lineage: Certification Test
 *
 * Seven suites, 85+ assertions.
 *   A — Evidence ledger
 *   B — Factor scoring
 *   C — Recency and temporal interaction
 *   D — Rights derivation
 *   E — Caps and scars
 *   F — Anti-fake suite
 *   G — Cross-layer safety
 */

import {
  appendEdgeEvidence, getEvidenceForEdge, getEvidenceBySource,
  getEvidenceByClass, getEvidenceForNodePair, getEvidenceAtReplayTime,
  getLatestConfirmationTime, getEvidenceById, getEvidenceByEdgeType,
  resetEdgeEvidenceLedger,
  EVIDENCE_STRENGTH_RANK,
} from '../services/knowledge-graph/edge-evidence-ledger';
import type { EdgeEvidenceRecord, EdgeEvidenceClass } from '../services/knowledge-graph/edge-evidence-ledger';

import {
  evaluateEdgeConfidence, deriveEdgeRightsProfile,
  computeEdgeRecencyScore, applyEdgeConfidenceCaps,
  emitEdgeConfidenceAuditEvent,
} from '../services/knowledge-graph/edge-confidence-model';
import type {
  EdgeConfidenceInput, GraphEdgeState, EdgeScarCode,
  NodeConfidenceInput, RecencyBand,
} from '../services/knowledge-graph/edge-confidence-model';

import { resetRelationOntology, bootstrapRelationOntology } from '../services/knowledge-graph/relation-ontology';
import type { EdgeType } from '../services/knowledge-graph/relation-ontology';

let passed = 0;
let failed = 0;

function ok(id: string, expr: boolean, msg: string): void {
  if (expr) { passed++; }
  else { failed++; console.error(`  FAIL ${id}: ${msg}`); }
}

function freshState(): void {
  resetEdgeEvidenceLedger();
  resetRelationOntology();
  bootstrapRelationOntology();
}

const NOW = '2026-04-03T12:00:00Z';
const RECENT = '2026-04-03T11:00:00Z';
const OLD = '2026-03-01T00:00:00Z';
const ANCIENT = '2025-01-01T00:00:00Z';

let eidCounter = 0;
function makeEvidence(overrides: Partial<EdgeEvidenceRecord> = {}): EdgeEvidenceRecord {
  eidCounter++;
  return {
    evidenceId: `ev_${eidCounter}`,
    edgeId: 'edge_001',
    edgeType: 'ASSET_BELONGS_TO_PROTOCOL',
    evidenceClass: 'CANONICAL_STRUCTURAL',
    sourceModule: 'l3_projection',
    subjectNodeId: 'gn:canonical:asset:ast_uni',
    objectNodeId: 'gn:canonical:protocol:proto_uni',
    subjectCanonicalObjectId: 'ast_uni',
    objectCanonicalObjectId: 'proto_uni',
    metricObservationRefs: [],
    mutationRefs: [],
    lineageRefs: ['lineage_001'],
    sourceRefs: ['src_001'],
    replayCompatibility: { schemaVersion: 'v1' },
    observedAt: RECENT,
    ingestedAt: NOW,
    lastConfirmedAt: RECENT,
    metadata: {},
    ...overrides,
  };
}

function makeInput(overrides: Partial<EdgeConfidenceInput> = {}): EdgeConfidenceInput {
  return {
    edgeId: 'edge_001',
    edgeType: 'ASSET_BELONGS_TO_PROTOCOL' as EdgeType,
    subjectNodeId: 'gn:canonical:asset:ast_uni',
    objectNodeId: 'gn:canonical:protocol:proto_uni',
    subjectConfidence: { band: 'HIGH', score: 0.9 },
    objectConfidence: { band: 'HIGH', score: 0.85 },
    evidence: [makeEvidence()],
    currentTime: NOW,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE A — EVIDENCE LEDGER
// ═══════════════════════════════════════════════════════════════════════════════

function suiteA(): void {
  console.log('\n--- Suite A: Evidence Ledger ---');
  freshState();

  const ev1 = makeEvidence({ evidenceId: 'ev_a1' });
  const r1 = appendEdgeEvidence(ev1);
  ok('A1', r1.success, 'Append evidence succeeds');

  const found = getEvidenceById('ev_a1');
  ok('A2', !!found, 'Evidence retrievable by ID');
  ok('A3', found!.evidenceClass === 'CANONICAL_STRUCTURAL', 'Evidence class preserved');

  const byEdge = getEvidenceForEdge('edge_001');
  ok('A4', byEdge.length >= 1, 'Evidence by edge lookup works');

  const ev2 = makeEvidence({ evidenceId: 'ev_a2', sourceModule: 'reconciliation' });
  appendEdgeEvidence(ev2);
  const bySource = getEvidenceBySource('reconciliation');
  ok('A5', bySource.length === 1, 'Evidence by source lookup works');

  const byClass = getEvidenceByClass('CANONICAL_STRUCTURAL');
  ok('A6', byClass.length >= 1, 'Evidence by class lookup works');

  const byPair = getEvidenceForNodePair('gn:canonical:asset:ast_uni', 'gn:canonical:protocol:proto_uni');
  ok('A7', byPair.length >= 2, 'Evidence by node pair lookup works');

  const ev3 = makeEvidence({ evidenceId: 'ev_a3', observedAt: '2026-03-15T00:00:00Z' });
  appendEdgeEvidence(ev3);
  const atReplay = getEvidenceAtReplayTime('edge_001', '2026-03-20T00:00:00Z');
  ok('A8', atReplay.length >= 1, 'Replay-time retrieval works');
  ok('A9', atReplay.every(r => new Date(r.observedAt) <= new Date('2026-03-20T00:00:00Z')),
    'Replay-time evidence filtered correctly');

  const latest = getLatestConfirmationTime('edge_001');
  ok('A10', !!latest, 'Latest confirmation time retrievable');

  const dup = appendEdgeEvidence({ ...ev1 });
  ok('A11', !dup.success, 'Duplicate evidence ID rejected');
  ok('A12', dup.error === 'DUPLICATE_EVIDENCE_ID', 'Correct error code');

  const noId = appendEdgeEvidence({ ...ev1, evidenceId: '' });
  ok('A13', !noId.success, 'Missing evidence ID rejected');

  const noType = appendEdgeEvidence({ ...makeEvidence({ evidenceId: 'ev_a_notype' }), edgeType: '' });
  ok('A14', !noType.success, 'Missing edge type rejected');

  const noReplay = appendEdgeEvidence({
    ...makeEvidence({ evidenceId: 'ev_a_noreplay' }),
    replayCompatibility: { schemaVersion: '' },
  });
  ok('A15', !noReplay.success, 'Missing replay schema rejected');

  const byEdgeType = getEvidenceByEdgeType('ASSET_BELONGS_TO_PROTOCOL');
  ok('A16', byEdgeType.length >= 1, 'Evidence by edge type works');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE B — FACTOR SCORING
// ═══════════════════════════════════════════════════════════════════════════════

function suiteB(): void {
  console.log('\n--- Suite B: Factor Scoring ---');
  freshState();

  const strongStructural = evaluateEdgeConfidence(makeInput({
    evidence: [
      makeEvidence({ evidenceId: 'ev_b1', evidenceClass: 'CANONICAL_STRUCTURAL', sourceModule: 'l3_proj' }),
      makeEvidence({ evidenceId: 'ev_b2', evidenceClass: 'RECONCILIATION_DERIVED', sourceModule: 'reconciler' }),
    ],
  }));
  ok('B1', strongStructural.confidenceBand === 'HIGH', 'Strong structural evidence → HIGH band');
  ok('B2', strongStructural.confidenceScore > 0.7, 'Score above 0.7');
  ok('B3', strongStructural.factorEvaluations.length === 7, 'All 7 factors evaluated');

  const sparseNarrative = evaluateEdgeConfidence(makeInput({
    edgeType: 'NARRATIVE_AFFECTS_ASSET' as EdgeType,
    evidence: [
      makeEvidence({ evidenceId: 'ev_b3', evidenceClass: 'NARRATIVE_SIGNAL', edgeType: 'NARRATIVE_AFFECTS_ASSET' }),
    ],
  }));
  ok('B4', sparseNarrative.confidenceBand !== 'HIGH', 'Sparse narrative evidence not HIGH');
  ok('B5', sparseNarrative.scars.includes('EVIDENCE_SPARSE') || sparseNarrative.scars.includes('EVIDENCE_MONOCULTURE'),
    'Sparse/monoculture scar present');

  const diverseEvidence = evaluateEdgeConfidence(makeInput({
    evidence: [
      makeEvidence({ evidenceId: 'ev_b4', evidenceClass: 'CANONICAL_STRUCTURAL', sourceModule: 'src_a' }),
      makeEvidence({ evidenceId: 'ev_b5', evidenceClass: 'METRIC_SUPPORTED', sourceModule: 'src_b' }),
      makeEvidence({ evidenceId: 'ev_b6', evidenceClass: 'RECONCILIATION_DERIVED', sourceModule: 'src_c' }),
    ],
  }));
  ok('B6', diverseEvidence.confidenceScore > sparseNarrative.confidenceScore,
    'Diverse evidence scores higher than sparse narrative');

  const disagreeEvidence = evaluateEdgeConfidence(makeInput({
    evidence: [
      makeEvidence({ evidenceId: 'ev_b7', sourceModule: 'src_x', confidenceHints: ['DISAGREE_ON_RELATION'] }),
      makeEvidence({ evidenceId: 'ev_b8', sourceModule: 'src_y', confidenceHints: ['CONFLICT_DETECTED'] }),
    ],
  }));
  ok('B7', disagreeEvidence.scars.includes('SOURCE_DISAGREEMENT'), 'Source disagreement penalizes');

  const lowSubject = evaluateEdgeConfidence(makeInput({
    subjectConfidence: { band: 'LOW', score: 0.3 },
    evidence: [makeEvidence({ evidenceId: 'ev_b9' })],
  }));
  ok('B8', lowSubject.scars.includes('SUBJECT_CONFIDENCE_FLOOR_LOW'), 'Low subject confidence scar');
  ok('B9', lowSubject.confidenceBand !== 'HIGH', 'Low subject caps edge below HIGH');

  const weakReplay = evaluateEdgeConfidence(makeInput({
    evidence: [
      makeEvidence({
        evidenceId: 'ev_b10', lineageRefs: [], sourceRefs: [],
        replayCompatibility: { schemaVersion: '' },
      }),
    ],
  }));
  ok('B10', weakReplay.scars.includes('REPLAY_TRACE_WEAK'), 'Weak replay trace penalized');

  const noEvidence = evaluateEdgeConfidence(makeInput({ evidence: [] }));
  ok('B11', noEvidence.confidenceBand === 'UNRESOLVED', 'No evidence → UNRESOLVED');
  ok('B12', noEvidence.admissibilityState === 'INADMISSIBLE', 'No evidence → INADMISSIBLE');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE C — RECENCY AND TEMPORAL
// ═══════════════════════════════════════════════════════════════════════════════

function suiteC(): void {
  console.log('\n--- Suite C: Recency & Temporal ---');
  freshState();

  const freshEvidence = [makeEvidence({ evidenceId: 'ev_c1', lastConfirmedAt: RECENT })];
  const freshRecency = computeEdgeRecencyScore(freshEvidence, 'ASSET_BELONGS_TO_PROTOCOL' as EdgeType, NOW);
  ok('C1', freshRecency.band === 'FRESH', 'Recent evidence → FRESH');
  ok('C2', freshRecency.score >= 0.9, 'Fresh recency score high');

  const rollingEvidence = [makeEvidence({
    evidenceId: 'ev_c2', edgeType: 'WALLET_INTERACTS_WITH_PROTOCOL',
    lastConfirmedAt: OLD,
  })];
  const rollingRecency = computeEdgeRecencyScore(rollingEvidence, 'WALLET_INTERACTS_WITH_PROTOCOL' as EdgeType, NOW);
  ok('C3', rollingRecency.band === 'EXPIRED', 'Old rolling evidence → EXPIRED');
  ok('C4', rollingRecency.score < 0.2, 'Expired recency score low');

  const slippingEvidence = [makeEvidence({
    evidenceId: 'ev_c3', edgeType: 'WALLET_INTERACTS_WITH_PROTOCOL',
    lastConfirmedAt: '2026-03-30T00:00:00Z',
  })];
  const slipRecency = computeEdgeRecencyScore(slippingEvidence, 'WALLET_INTERACTS_WITH_PROTOCOL' as EdgeType, NOW);
  ok('C5', slipRecency.band === 'SLIPPING' || slipRecency.band === 'STALE', 'Slipping evidence recognized');

  const eventEvidence = [makeEvidence({
    evidenceId: 'ev_c4', edgeType: 'UNLOCK_IMPACTS_FLOAT',
    lastConfirmedAt: '2026-03-01T00:00:00Z',
  })];
  const eventRecency = computeEdgeRecencyScore(eventEvidence, 'UNLOCK_IMPACTS_FLOAT' as EdgeType, NOW);
  ok('C6', eventRecency.band === 'STALE' || eventRecency.band === 'EXPIRED', 'Old event evidence stale/expired');

  const staleState = evaluateEdgeConfidence(makeInput({
    edgeType: 'WALLET_INTERACTS_WITH_PROTOCOL' as EdgeType,
    evidence: [makeEvidence({
      evidenceId: 'ev_c5', edgeType: 'WALLET_INTERACTS_WITH_PROTOCOL',
      lastConfirmedAt: ANCIENT, observedAt: ANCIENT,
    })],
  }));
  ok('C7', staleState.scars.includes('STALE_EDGE'), 'Stale edge scarred');
  ok('C8', staleState.recencyBand === 'EXPIRED', 'Recency band reflects expiry');

  const persistentRecency = computeEdgeRecencyScore(
    [makeEvidence({ evidenceId: 'ev_c6', lastConfirmedAt: OLD })],
    'ASSET_BELONGS_TO_PROTOCOL' as EdgeType, NOW,
  );
  ok('C9', persistentRecency.band === 'FRESH', 'Persistent edge stays fresh (no stale policy)');

  const noEvRecency = computeEdgeRecencyScore([], 'ASSET_BELONGS_TO_PROTOCOL' as EdgeType, NOW);
  ok('C10', noEvRecency.band === 'EXPIRED', 'No evidence → EXPIRED recency');

  const decayingRecency = computeEdgeRecencyScore(
    [makeEvidence({
      evidenceId: 'ev_c7', edgeType: 'NARRATIVE_AFFECTS_ASSET',
      lastConfirmedAt: '2026-03-29T00:00:00Z',
    })],
    'NARRATIVE_AFFECTS_ASSET' as EdgeType, NOW,
  );
  ok('C11', decayingRecency.band === 'STALE' || decayingRecency.band === 'SLIPPING',
    'Decaying narrative edge ages correctly');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE D — RIGHTS DERIVATION
// ═══════════════════════════════════════════════════════════════════════════════

function suiteD(): void {
  console.log('\n--- Suite D: Rights Derivation ---');
  freshState();

  const highRights = deriveEdgeRightsProfile('HIGH', 'ASSET_BELONGS_TO_PROTOCOL' as EdgeType, []);
  ok('D1', highRights.contextEnrichment === 'ALLOW', 'HIGH → context ALLOW');
  ok('D2', highRights.judgmentSupport === 'ALLOW', 'HIGH → judgment ALLOW');
  ok('D3', highRights.explanation === 'ALLOW', 'HIGH → explanation ALLOW');
  ok('D4', highRights.propagation === 'DENY', 'HIGH structural → propagation DENY (not eligible)');

  const mediumRights = deriveEdgeRightsProfile('MEDIUM', 'ASSET_BELONGS_TO_PROTOCOL' as EdgeType, []);
  ok('D5', mediumRights.contextEnrichment === 'ALLOW', 'MEDIUM → context ALLOW');
  ok('D6', mediumRights.judgmentSupport === 'CONDITIONAL', 'MEDIUM → judgment CONDITIONAL');
  ok('D7', mediumRights.propagation === 'DENY', 'MEDIUM structural → propagation DENY');

  const lowRights = deriveEdgeRightsProfile('LOW', 'ASSET_BELONGS_TO_PROTOCOL' as EdgeType, []);
  ok('D8', lowRights.contextEnrichment === 'ALLOW_WITH_SCAR', 'LOW → context ALLOW_WITH_SCAR');
  ok('D9', lowRights.propagation === 'DENY', 'LOW → propagation DENY');
  ok('D10', lowRights.judgmentSupport === 'DENY', 'LOW → judgment DENY');
  ok('D11', lowRights.clustering === 'DENY', 'LOW → clustering DENY');

  const unresolvedRights = deriveEdgeRightsProfile('UNRESOLVED', 'ASSET_BELONGS_TO_PROTOCOL' as EdgeType, []);
  ok('D12', unresolvedRights.judgmentSupport === 'DENY', 'UNRESOLVED → judgment DENY');
  ok('D13', unresolvedRights.comparison === 'DENY', 'UNRESOLVED → comparison DENY');
  ok('D14', unresolvedRights.propagation === 'DENY', 'UNRESOLVED → propagation DENY');

  const narrativeRights = deriveEdgeRightsProfile('MEDIUM', 'NARRATIVE_AFFECTS_ASSET' as EdgeType, []);
  ok('D15', narrativeRights.propagation === 'CONDITIONAL', 'MEDIUM narrative → propagation CONDITIONAL (eligible)');
  ok('D16', narrativeRights.judgmentSupport === 'DENY',
    'MEDIUM narrative → judgment DENY (blocked under uncertainty)');

  const walletRights = deriveEdgeRightsProfile('MEDIUM', 'WALLET_INTERACTS_WITH_PROTOCOL' as EdgeType, []);
  ok('D17', walletRights.judgmentSupport === 'DENY',
    'MEDIUM wallet interaction → judgment DENY (blocked under uncertainty)');
  ok('D18', walletRights.competitorDiscovery === 'DENY',
    'MEDIUM wallet interaction → competitor discovery DENY (blocked)');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE E — CAPS AND SCARS
// ═══════════════════════════════════════════════════════════════════════════════

function suiteE(): void {
  console.log('\n--- Suite E: Caps & Scars ---');
  freshState();

  const clusterOnly = evaluateEdgeConfidence(makeInput({
    edgeType: 'ASSET_IN_SECTOR' as EdgeType,
    evidence: [
      makeEvidence({ evidenceId: 'ev_e1', evidenceClass: 'CLUSTER_DERIVED', edgeType: 'ASSET_IN_SECTOR' }),
    ],
  }));
  ok('E1', clusterOnly.scars.includes('CLUSTER_DERIVED_ONLY'), 'Cluster-derived-only scar present');
  ok('E2', clusterOnly.confidenceBand !== 'HIGH', 'Cluster-derived-only caps below HIGH');

  const inferredOnly = evaluateEdgeConfidence(makeInput({
    edgeType: 'ASSET_HAS_COMPETITOR' as EdgeType,
    evidence: [
      makeEvidence({ evidenceId: 'ev_e2', evidenceClass: 'NARRATIVE_SIGNAL', edgeType: 'ASSET_HAS_COMPETITOR' }),
    ],
  }));
  ok('E3', inferredOnly.scars.includes('INFERRED_ONLY'), 'Inferred-only scar present');

  const behavioralOnly = evaluateEdgeConfidence(makeInput({
    edgeType: 'WALLET_INTERACTS_WITH_PROTOCOL' as EdgeType,
    evidence: [
      makeEvidence({
        evidenceId: 'ev_e3', evidenceClass: 'BEHAVIORAL_INTERACTION',
        edgeType: 'WALLET_INTERACTS_WITH_PROTOCOL',
        lastConfirmedAt: RECENT,
      }),
    ],
  }));
  ok('E4', behavioralOnly.scars.includes('BEHAVIORAL_NOT_STRUCTURAL'), 'Behavioral-not-structural scar');

  const weakCausality = evaluateEdgeConfidence(makeInput({
    edgeType: 'UNLOCK_IMPACTS_FLOAT' as EdgeType,
    evidence: [
      makeEvidence({
        evidenceId: 'ev_e4', evidenceClass: 'EVENT_DERIVED',
        edgeType: 'UNLOCK_IMPACTS_FLOAT', lastConfirmedAt: RECENT,
      }),
    ],
  }));
  ok('E5', weakCausality.confidenceBand !== 'HIGH', 'Single event evidence not HIGH for impact edge');

  const staleNarrow = evaluateEdgeConfidence(makeInput({
    edgeType: 'WALLET_INTERACTS_WITH_PROTOCOL' as EdgeType,
    evidence: [
      makeEvidence({
        evidenceId: 'ev_e5', evidenceClass: 'BEHAVIORAL_INTERACTION',
        edgeType: 'WALLET_INTERACTS_WITH_PROTOCOL',
        lastConfirmedAt: ANCIENT, observedAt: ANCIENT,
      }),
    ],
  }));
  ok('E6', staleNarrow.scars.includes('STALE_EDGE'), 'Stale edge scar present');
  ok('E7', staleNarrow.rightsProfile.propagation === 'DENY', 'Stale edge propagation denied');

  const unresolvedSubject = evaluateEdgeConfidence(makeInput({
    subjectConfidence: { band: 'UNRESOLVED', score: 0.1 },
    evidence: [makeEvidence({ evidenceId: 'ev_e6' })],
  }));
  ok('E8', unresolvedSubject.capChain.some(c => c.includes('NODE_FLOOR_CAP')), 'Unresolved subject triggers cap');
  ok('E9', unresolvedSubject.confidenceBand === 'LOW' || unresolvedSubject.confidenceBand === 'UNRESOLVED',
    'Unresolved subject caps to LOW or below');

  const lowBothEndpoints = evaluateEdgeConfidence(makeInput({
    subjectConfidence: { band: 'LOW', score: 0.3 },
    objectConfidence: { band: 'LOW', score: 0.3 },
    evidence: [
      makeEvidence({ evidenceId: 'ev_e7' }),
      makeEvidence({ evidenceId: 'ev_e8', sourceModule: 'alt' }),
    ],
  }));
  ok('E10', lowBothEndpoints.confidenceBand !== 'HIGH', 'Both endpoints LOW caps below HIGH');

  const sparseMonoculture: EdgeScarCode[] = ['EVIDENCE_SPARSE', 'EVIDENCE_MONOCULTURE'];
  const { band: capBand } = applyEdgeConfidenceCaps(
    'HIGH', sparseMonoculture, makeInput(), 'FRESH',
  );
  ok('E11', capBand === 'LOW', 'Sparse + monoculture cap to LOW');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE F — ANTI-FAKE
// ═══════════════════════════════════════════════════════════════════════════════

function suiteF(): void {
  console.log('\n--- Suite F: Anti-Fake ---');
  freshState();

  const narrativeJudge = evaluateEdgeConfidence(makeInput({
    edgeType: 'NARRATIVE_AFFECTS_ASSET' as EdgeType,
    evidence: [
      makeEvidence({ evidenceId: 'ev_f1', evidenceClass: 'NARRATIVE_SIGNAL', edgeType: 'NARRATIVE_AFFECTS_ASSET' }),
    ],
  }));
  ok('F1', narrativeJudge.rightsProfile.judgmentSupport === 'DENY',
    'Narrative-only edge cannot support deterministic judgment');
  ok('F2', narrativeJudge.confidenceBand !== 'HIGH', 'Narrative-only not HIGH');

  const walletStruct = evaluateEdgeConfidence(makeInput({
    edgeType: 'WALLET_INTERACTS_WITH_PROTOCOL' as EdgeType,
    evidence: [
      makeEvidence({
        evidenceId: 'ev_f2', evidenceClass: 'BEHAVIORAL_INTERACTION',
        edgeType: 'WALLET_INTERACTS_WITH_PROTOCOL', lastConfirmedAt: RECENT,
      }),
    ],
  }));
  ok('F3', walletStruct.rightsProfile.judgmentSupport === 'DENY',
    'Wallet interaction cannot behave like structural dependency for judgment');
  ok('F4', walletStruct.scars.includes('BEHAVIORAL_NOT_STRUCTURAL'),
    'Behavioral scar present on wallet interaction');

  const clusterCompetitor = evaluateEdgeConfidence(makeInput({
    edgeType: 'ASSET_HAS_COMPETITOR' as EdgeType,
    evidence: [
      makeEvidence({
        evidenceId: 'ev_f3', evidenceClass: 'CLUSTER_DERIVED',
        edgeType: 'ASSET_HAS_COMPETITOR',
      }),
    ],
  }));
  ok('F5', clusterCompetitor.confidenceBand !== 'HIGH',
    'Cluster-derived competitor edge not unrestricted HIGH');
  ok('F6', clusterCompetitor.scars.includes('CLUSTER_DERIVED_ONLY') || clusterCompetitor.scars.includes('INFERRED_ONLY'),
    'Cluster/inferred scar on competitor edge');

  const expiredEvent = evaluateEdgeConfidence(makeInput({
    edgeType: 'UNLOCK_IMPACTS_FLOAT' as EdgeType,
    evidence: [
      makeEvidence({
        evidenceId: 'ev_f4', evidenceClass: 'EVENT_DERIVED',
        edgeType: 'UNLOCK_IMPACTS_FLOAT',
        lastConfirmedAt: ANCIENT, observedAt: ANCIENT,
      }),
    ],
  }));
  ok('F7', expiredEvent.rightsProfile.propagation === 'DENY', 'Expired event edge propagation denied');
  ok('F8', expiredEvent.scars.includes('STALE_EDGE'), 'Expired event carries stale scar');

  const weakReplayProp = evaluateEdgeConfidence(makeInput({
    edgeType: 'NARRATIVE_AFFECTS_ASSET' as EdgeType,
    evidence: [
      makeEvidence({
        evidenceId: 'ev_f5', evidenceClass: 'NARRATIVE_SIGNAL',
        edgeType: 'NARRATIVE_AFFECTS_ASSET',
        lineageRefs: [], sourceRefs: [],
        replayCompatibility: { schemaVersion: '' },
      }),
    ],
  }));
  ok('F9', weakReplayProp.scars.includes('REPLAY_TRACE_WEAK'), 'Weak replay trace scarred');
  ok('F10', weakReplayProp.capChain.some(c => c.includes('REPLAY_CAP')), 'Replay cap applied');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE G — CROSS-LAYER SAFETY
// ═══════════════════════════════════════════════════════════════════════════════

function suiteG(): void {
  console.log('\n--- Suite G: Cross-Layer Safety ---');
  freshState();

  const state = evaluateEdgeConfidence(makeInput({
    evidence: [
      makeEvidence({ evidenceId: 'ev_g1', evidenceClass: 'CANONICAL_STRUCTURAL' }),
      makeEvidence({ evidenceId: 'ev_g2', evidenceClass: 'METRIC_SUPPORTED', sourceModule: 'metric_engine' }),
    ],
  }));

  ok('G1', state.contractVersion === 'v1', 'Contract version from L4.1 preserved');
  ok('G2', state.policyVersion === '1.0.0', 'Policy version present');
  ok('G3', state.evaluationVersion === '1.0.0', 'Evaluation version present');
  ok('G4', state.evidenceRefs.length === 2, 'Evidence refs preserved');
  ok('G5', state.factorEvaluations.length === 7, 'All 7 factor evaluations present');

  const walletEdge = evaluateEdgeConfidence(makeInput({
    edgeType: 'WALLET_INTERACTS_WITH_PROTOCOL' as EdgeType,
    evidence: [
      makeEvidence({
        evidenceId: 'ev_g3', evidenceClass: 'BEHAVIORAL_INTERACTION',
        edgeType: 'WALLET_INTERACTS_WITH_PROTOCOL', lastConfirmedAt: RECENT,
      }),
      makeEvidence({
        evidenceId: 'ev_g4', evidenceClass: 'METRIC_SUPPORTED',
        sourceModule: 'metric_eng', edgeType: 'WALLET_INTERACTS_WITH_PROTOCOL', lastConfirmedAt: RECENT,
      }),
    ],
  }));
  ok('G6', walletEdge.rightsProfile.judgmentSupport === 'DENY',
    'L4.1 blocked uses remain blocked in L4.2 rights');

  const lowL3 = evaluateEdgeConfidence(makeInput({
    subjectConfidence: { band: 'LOW', score: 0.3 },
    objectConfidence: { band: 'HIGH', score: 0.9 },
    evidence: [
      makeEvidence({ evidenceId: 'ev_g5' }),
      makeEvidence({ evidenceId: 'ev_g6', sourceModule: 'alt2' }),
    ],
  }));
  ok('G7', lowL3.scars.includes('SUBJECT_CONFIDENCE_FLOOR_LOW'), 'L3 confidence floor inherited as scar');
  ok('G8', lowL3.capChain.some(c => c.includes('NODE_FLOOR_CAP')), 'L3 floor cap applied');

  const metricEvidence = makeEvidence({
    evidenceId: 'ev_g7', evidenceClass: 'METRIC_SUPPORTED',
    metricObservationRefs: ['mobs_001', 'mobs_002'],
  });
  appendEdgeEvidence(metricEvidence);
  const retrieved = getEvidenceById('ev_g7');
  ok('G9', retrieved!.metricObservationRefs.length === 2, 'Metric-backed edge preserves metric refs');

  const mutEvidence = makeEvidence({
    evidenceId: 'ev_g8', evidenceClass: 'MUTATION_DERIVED',
    mutationRefs: ['mut_001'],
  });
  appendEdgeEvidence(mutEvidence);
  const mutRetrieved = getEvidenceById('ev_g8');
  ok('G10', mutRetrieved!.mutationRefs.length === 1, 'Mutation-derived edge preserves mutation refs');

  ok('G11', state.admissibilityState === 'ADMISSIBLE' || state.admissibilityState === 'CONDITIONAL',
    'Strong evidence → admissible or conditional');

  const audit = emitEdgeConfidenceAuditEvent(state);
  ok('G12', audit.eventType === 'EDGE_CONFIDENCE_EVALUATED', 'Audit event type correct');
  ok('G13', audit.edgeId === state.edgeId, 'Audit references correct edge');
  ok('G14', audit.band === state.confidenceBand, 'Audit band matches state');

  ok('G15', EVIDENCE_STRENGTH_RANK['CANONICAL_STRUCTURAL'] > EVIDENCE_STRENGTH_RANK['NARRATIVE_SIGNAL'],
    'Evidence strength hierarchy: structural > narrative');
  ok('G16', EVIDENCE_STRENGTH_RANK['METRIC_SUPPORTED'] > EVIDENCE_STRENGTH_RANK['BEHAVIORAL_INTERACTION'],
    'Evidence strength hierarchy: metric > behavioral');
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN ALL
// ═══════════════════════════════════════════════════════════════════════════════

suiteA();
suiteB();
suiteC();
suiteD();
suiteE();
suiteF();
suiteG();

console.log(`\n${'═'.repeat(60)}`);
console.log(`L4.2 Edge Confidence — TOTAL: ${passed + failed} | ✅ ${passed} | ❌ ${failed}`);
console.log(`${'═'.repeat(60)}`);
if (failed > 0) process.exit(1);
