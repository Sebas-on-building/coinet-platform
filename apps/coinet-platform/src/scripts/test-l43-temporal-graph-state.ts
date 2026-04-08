/**
 * L4.3 — Temporal Graph State: Certification Test
 *
 * Eight suites, 95+ assertions.
 *   A — Initial state creation
 *   B — Transition legality
 *   C — Stale and expiry thresholds
 *   D — Decay logic
 *   E — Historical preservation
 *   F — Replay reconstruction
 *   G — Rights narrowing
 *   H — Anti-fake suite
 */

import {
  createTemporalState, applyTemporalTransition, isLegalTransition,
  evaluateTemporalTransition, computeDecayFactor,
  computeStaleAt, computeExpireAt,
  getTemporalStateForEdge, getTemporalStateForEdgeAtTime,
  getActiveEdgesAtTime, getEdgesByTemporalStatusAtTime,
  getEdgeIdsByStatus, reconstructGraphStateAtTime,
  getTemporalHistoryForEdge, getTransitionsForEdge,
  getTemporalRightsNarrowing, emitTemporalTransitionEvent,
  resetTemporalGraphState,
} from '../services/knowledge-graph/temporal-graph-state';
import type {
  TemporalEdgeStatus, CreateTemporalStateInput,
} from '../services/knowledge-graph/temporal-graph-state';

import { resetRelationOntology, bootstrapRelationOntology } from '../services/knowledge-graph/relation-ontology';
import type { EdgeType } from '../services/knowledge-graph/relation-ontology';

let passed = 0;
let failed = 0;

function ok(id: string, expr: boolean, msg: string): void {
  if (expr) { passed++; }
  else { failed++; console.error(`  FAIL ${id}: ${msg}`); }
}

function freshState(): void {
  resetTemporalGraphState();
  resetRelationOntology();
  bootstrapRelationOntology();
}

const T0 = '2026-03-01T00:00:00Z';
const T1 = '2026-03-15T00:00:00Z';
const T2 = '2026-04-01T00:00:00Z';
const T3 = '2026-04-03T12:00:00Z';
const T4 = '2026-05-01T00:00:00Z';
const T5 = '2026-06-01T00:00:00Z';

function makeCreate(edgeId: string, edgeType: EdgeType, status: TemporalEdgeStatus, overrides: Partial<CreateTemporalStateInput> = {}): CreateTemporalStateInput {
  return {
    edgeId, edgeType, status, validFrom: T1,
    lastConfirmedAt: T1,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE A — INITIAL STATE CREATION
// ═══════════════════════════════════════════════════════════════════════════════

function suiteA(): void {
  console.log('\n--- Suite A: Initial State Creation ---');
  freshState();

  const structural = createTemporalState(makeCreate('edge_s1', 'ASSET_BELONGS_TO_PROTOCOL' as EdgeType, 'ACTIVE'));
  ok('A1', structural.success, 'Active structural edge created');
  ok('A2', structural.state!.status === 'ACTIVE', 'Status is ACTIVE');
  ok('A3', structural.state!.decayPolicy.kind === 'NONE', 'Persistent edge has NONE decay');
  ok('A4', structural.state!.timeBoundedRelevance!.relevanceClass === 'PERSISTENT', 'Relevance class is PERSISTENT');
  ok('A5', structural.state!.contractVersion === 'v1', 'Contract version present');
  ok('A6', structural.state!.schemaVersion === 'v1', 'Schema version present');
  ok('A7', structural.state!.activeRightsSnapshot.propagation === 'ALLOW', 'ACTIVE allows propagation');

  const event = createTemporalState(makeCreate('edge_ev1', 'UNLOCK_IMPACTS_FLOAT' as EdgeType, 'PROVISIONAL', {
    eventWindow: { startAt: T2, endAt: T4 },
  }));
  ok('A8', event.success, 'Provisional event edge created');
  ok('A9', event.state!.status === 'PROVISIONAL', 'Status is PROVISIONAL');
  ok('A10', event.state!.decayPolicy.kind === 'EVENT_DRIVEN', 'Event-bounded edge has EVENT_DRIVEN decay');
  ok('A11', event.state!.timeBoundedRelevance!.relevanceClass === 'EVENT_ONLY', 'Relevance class is EVENT_ONLY');
  ok('A12', !!event.state!.staleAt, 'Event edge has staleAt');
  ok('A13', !!event.state!.expireAt, 'Event edge has expireAt');

  const contested = createTemporalState(makeCreate('edge_c1', 'PROTOCOL_HAS_COMPETITOR' as EdgeType, 'CONTESTED', {
    contestedWindow: { startedAt: T1, reasonCodes: ['CONFLICTING_CLAIMS'], conflictingEvidenceRefs: ['ev_x'] },
  }));
  ok('A14', contested.success, 'Contested initial state created');
  ok('A15', contested.state!.status === 'CONTESTED', 'Status is CONTESTED');
  ok('A16', !!contested.state!.contestedWindow, 'Contested window present');
  ok('A17', contested.state!.contestedWindow!.reasonCodes.includes('CONFLICTING_CLAIMS'), 'Contest reason preserved');

  const historical = createTemporalState(makeCreate('edge_h1', 'ASSET_BELONGS_TO_PROTOCOL' as EdgeType, 'HISTORICAL'));
  ok('A18', !historical.success, 'HISTORICAL initial state blocked');
  ok('A19', historical.error === 'HISTORICAL_NOT_VALID_INITIAL_STATE', 'Correct error code');

  const narrative = createTemporalState(makeCreate('edge_n1', 'NARRATIVE_AFFECTS_ASSET' as EdgeType, 'ACTIVE'));
  ok('A20', narrative.state!.decayPolicy.kind === 'LINEAR', 'Decaying narrative has LINEAR decay');
  ok('A21', narrative.state!.timeBoundedRelevance!.relevanceClass === 'DECAYING', 'Relevance class is DECAYING');

  const rolling = createTemporalState(makeCreate('edge_r1', 'WALLET_INTERACTS_WITH_PROTOCOL' as EdgeType, 'ACTIVE'));
  ok('A22', rolling.state!.decayPolicy.kind === 'STEP', 'Rolling edge has STEP decay');
  ok('A23', !!rolling.state!.staleAt, 'Rolling edge has staleAt');
  ok('A24', !!rolling.state!.expireAt, 'Rolling edge has expireAt');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE B — TRANSITION LEGALITY
// ═══════════════════════════════════════════════════════════════════════════════

function suiteB(): void {
  console.log('\n--- Suite B: Transition Legality ---');
  freshState();

  ok('B1', isLegalTransition('PROVISIONAL', 'ACTIVE'), 'PROVISIONAL→ACTIVE legal');
  ok('B2', isLegalTransition('ACTIVE', 'STALE'), 'ACTIVE→STALE legal');
  ok('B3', isLegalTransition('STALE', 'EXPIRED'), 'STALE→EXPIRED legal');
  ok('B4', isLegalTransition('EXPIRED', 'HISTORICAL'), 'EXPIRED→HISTORICAL legal');
  ok('B5', isLegalTransition('CONTESTED', 'ACTIVE'), 'CONTESTED→ACTIVE legal');
  ok('B6', isLegalTransition('STALE', 'ACTIVE'), 'STALE→ACTIVE legal (re-freshened)');

  ok('B7', !isLegalTransition('EXPIRED', 'ACTIVE'), 'EXPIRED→ACTIVE illegal');
  ok('B8', !isLegalTransition('HISTORICAL', 'ACTIVE'), 'HISTORICAL→ACTIVE illegal');
  ok('B9', !isLegalTransition('ACTIVE', 'HISTORICAL'), 'ACTIVE→HISTORICAL illegal (must go through EXPIRED)');
  ok('B10', !isLegalTransition('PROVISIONAL', 'HISTORICAL'), 'PROVISIONAL→HISTORICAL illegal');

  createTemporalState(makeCreate('edge_b1', 'ASSET_BELONGS_TO_PROTOCOL' as EdgeType, 'PROVISIONAL'));
  const pToA = applyTemporalTransition({
    edgeId: 'edge_b1', toStatus: 'ACTIVE', reasonCodes: ['MATURED'], triggeredAt: T2,
  });
  ok('B11', pToA.success, 'PROVISIONAL→ACTIVE transition succeeds');
  ok('B12', pToA.state!.status === 'ACTIVE', 'New status is ACTIVE');
  ok('B13', !!pToA.transition, 'Transition record emitted');
  ok('B14', pToA.transition!.fromStatus === 'PROVISIONAL', 'Transition from PROVISIONAL');
  ok('B15', pToA.transition!.toStatus === 'ACTIVE', 'Transition to ACTIVE');

  const aToS = applyTemporalTransition({
    edgeId: 'edge_b1', toStatus: 'STALE', reasonCodes: ['FRESHNESS_DEGRADED'], triggeredAt: T3,
  });
  ok('B16', aToS.success, 'ACTIVE→STALE transition succeeds');

  const sToE = applyTemporalTransition({
    edgeId: 'edge_b1', toStatus: 'EXPIRED', reasonCodes: ['EXPIRY_REACHED'], triggeredAt: T4,
  });
  ok('B17', sToE.success, 'STALE→EXPIRED transition succeeds');

  const eToH = applyTemporalTransition({
    edgeId: 'edge_b1', toStatus: 'HISTORICAL', reasonCodes: ['ARCHIVED'], triggeredAt: T5,
  });
  ok('B18', eToH.success, 'EXPIRED→HISTORICAL transition succeeds');

  const illegalReactivation = applyTemporalTransition({
    edgeId: 'edge_b1', toStatus: 'ACTIVE', reasonCodes: ['ATTEMPTED_REACTIVATION'], triggeredAt: T5,
  });
  ok('B19', !illegalReactivation.success, 'HISTORICAL→ACTIVE blocked');
  ok('B20', illegalReactivation.error!.includes('ILLEGAL_TRANSITION'), 'Error identifies illegal transition');

  const noEdge = applyTemporalTransition({
    edgeId: 'nonexistent', toStatus: 'STALE', reasonCodes: ['X'], triggeredAt: T3,
  });
  ok('B21', !noEdge.success, 'Transition on nonexistent edge fails');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE C — STALE AND EXPIRY THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════════

function suiteC(): void {
  console.log('\n--- Suite C: Stale & Expiry Thresholds ---');
  freshState();

  const rollingStale = computeStaleAt('WALLET_INTERACTS_WITH_PROTOCOL' as EdgeType, T1);
  ok('C1', !!rollingStale, 'Rolling edge has staleAt');
  ok('C2', new Date(rollingStale!).getTime() > new Date(T1).getTime(), 'StaleAt is after lastConfirmedAt');

  const rollingExpire = computeExpireAt('WALLET_INTERACTS_WITH_PROTOCOL' as EdgeType, T1);
  ok('C3', !!rollingExpire, 'Rolling edge has expireAt');
  ok('C4', new Date(rollingExpire!).getTime() > new Date(rollingStale!).getTime(), 'ExpireAt after staleAt');

  const persistentStale = computeStaleAt('ASSET_BELONGS_TO_PROTOCOL' as EdgeType, T1);
  ok('C5', persistentStale === undefined, 'Persistent edge has no staleAt');

  const persistentExpire = computeExpireAt('ASSET_BELONGS_TO_PROTOCOL' as EdgeType, T1);
  ok('C6', persistentExpire === undefined, 'Persistent edge has no expireAt');

  const eventStale = computeStaleAt('UNLOCK_IMPACTS_FLOAT' as EdgeType, T1);
  ok('C7', !!eventStale, 'Event-bounded edge has staleAt');

  const eventExpire = computeExpireAt('UNLOCK_IMPACTS_FLOAT' as EdgeType, T1);
  ok('C8', !!eventExpire, 'Event-bounded edge has expireAt');

  createTemporalState(makeCreate('edge_c1', 'WALLET_INTERACTS_WITH_PROTOCOL' as EdgeType, 'ACTIVE', {
    lastConfirmedAt: T0,
  }));
  const eval1 = evaluateTemporalTransition({
    edgeId: 'edge_c1', recencyBand: 'STALE', lastConfirmedAt: T0, currentTime: T5,
  });
  ok('C9', eval1 !== null, 'Stale threshold triggers transition evaluation');
  ok('C10', eval1!.toStatus === 'EXPIRED' || eval1!.toStatus === 'STALE', 'Transition targets STALE or EXPIRED');

  createTemporalState(makeCreate('edge_c2', 'ASSET_BELONGS_TO_PROTOCOL' as EdgeType, 'ACTIVE', {
    lastConfirmedAt: T0,
  }));
  const eval2 = evaluateTemporalTransition({
    edgeId: 'edge_c2', recencyBand: 'FRESH', lastConfirmedAt: T0, currentTime: T5,
  });
  ok('C11', eval2 === null, 'Persistent fresh edge does not trigger transition');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE D — DECAY LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

function suiteD(): void {
  console.log('\n--- Suite D: Decay Logic ---');
  freshState();

  createTemporalState(makeCreate('edge_d1', 'NARRATIVE_AFFECTS_ASSET' as EdgeType, 'ACTIVE', {
    lastConfirmedAt: T1,
  }));
  const narrativeState = getTemporalStateForEdge('edge_d1')!;
  const freshDecay = computeDecayFactor(narrativeState, T1);
  ok('D1', freshDecay === 1.0, 'Fresh linear decay factor is 1.0');

  const midDecay = computeDecayFactor(narrativeState, T2);
  ok('D2', midDecay < 1.0, 'Mid-age linear decay < 1.0');
  ok('D3', midDecay > 0, 'Mid-age linear decay > 0');

  const lateDecay = computeDecayFactor(narrativeState, T5);
  ok('D4', lateDecay < midDecay, 'Later decay is lower');

  createTemporalState(makeCreate('edge_d2', 'WALLET_INTERACTS_WITH_PROTOCOL' as EdgeType, 'ACTIVE', {
    lastConfirmedAt: T1,
  }));
  const rollingState = getTemporalStateForEdge('edge_d2')!;
  const stepFresh = computeDecayFactor(rollingState, T1);
  ok('D5', stepFresh === 1.0, 'Step decay holds at 1.0 while fresh');

  const stepStale = computeDecayFactor(rollingState, T5);
  ok('D6', stepStale < 1.0, 'Step decay drops after threshold');
  ok('D7', stepStale === 0.3, 'Step decay drops to 0.3');

  createTemporalState(makeCreate('edge_d3', 'UNLOCK_IMPACTS_FLOAT' as EdgeType, 'ACTIVE', {
    lastConfirmedAt: T1,
    eventWindow: { startAt: T1, endAt: T2 },
  }));
  const eventState = getTemporalStateForEdge('edge_d3')!;
  const eventActive = computeDecayFactor(eventState, T1);
  ok('D8', eventActive === 1.0, 'Event-driven decay 1.0 during window');

  const eventAfter = computeDecayFactor(eventState, T4);
  ok('D9', eventAfter < 1.0, 'Event-driven decay drops after window');

  createTemporalState(makeCreate('edge_d4', 'ASSET_BELONGS_TO_PROTOCOL' as EdgeType, 'ACTIVE'));
  const persistState = getTemporalStateForEdge('edge_d4')!;
  const noneDecay = computeDecayFactor(persistState, T5);
  ok('D10', noneDecay === 1.0, 'NONE decay always 1.0');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE E — HISTORICAL PRESERVATION
// ═══════════════════════════════════════════════════════════════════════════════

function suiteE(): void {
  console.log('\n--- Suite E: Historical Preservation ---');
  freshState();

  createTemporalState(makeCreate('edge_e1', 'WALLET_INTERACTS_WITH_PROTOCOL' as EdgeType, 'ACTIVE'));
  applyTemporalTransition({ edgeId: 'edge_e1', toStatus: 'STALE', reasonCodes: ['FRESHNESS_DEGRADED'], triggeredAt: T2 });
  applyTemporalTransition({ edgeId: 'edge_e1', toStatus: 'EXPIRED', reasonCodes: ['EXPIRY_REACHED'], triggeredAt: T3 });
  applyTemporalTransition({ edgeId: 'edge_e1', toStatus: 'HISTORICAL', reasonCodes: ['ARCHIVED'], triggeredAt: T4 });

  const history = getTemporalHistoryForEdge('edge_e1');
  ok('E1', history.length >= 4, 'History chain has at least 4 records (create + 3 transitions)');

  const statuses = history.map(h => h.status);
  ok('E2', statuses.includes('ACTIVE'), 'History contains ACTIVE');
  ok('E3', statuses.includes('STALE'), 'History contains STALE');
  ok('E4', statuses.includes('EXPIRED'), 'History contains EXPIRED');
  ok('E5', statuses.includes('HISTORICAL'), 'History contains HISTORICAL');

  const transitions = getTransitionsForEdge('edge_e1');
  ok('E6', transitions.length === 3, 'Three transitions recorded');
  ok('E7', transitions[0].fromStatus === 'ACTIVE' && transitions[0].toStatus === 'STALE', 'First transition ACTIVE→STALE');
  ok('E8', transitions[1].fromStatus === 'STALE' && transitions[1].toStatus === 'EXPIRED', 'Second transition STALE→EXPIRED');
  ok('E9', transitions[2].fromStatus === 'EXPIRED' && transitions[2].toStatus === 'HISTORICAL', 'Third transition EXPIRED→HISTORICAL');

  const latest = getTemporalStateForEdge('edge_e1');
  ok('E10', latest!.status === 'HISTORICAL', 'Latest state is HISTORICAL');
  ok('E11', !!latest!.priorTemporalStateRef, 'Prior state ref preserved');
  ok('E12', latest!.historicalVisibility.preserveAfterExpiry, 'Preserve after expiry is true');
  ok('E13', latest!.historicalVisibility.preserveForReplay, 'Preserve for replay is true');
  ok('E14', latest!.historicalVisibility.preserveForForensics, 'Preserve for forensics is true');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE F — REPLAY RECONSTRUCTION
// ═══════════════════════════════════════════════════════════════════════════════

function suiteF(): void {
  console.log('\n--- Suite F: Replay Reconstruction ---');
  freshState();

  createTemporalState(makeCreate('edge_f1', 'ASSET_BELONGS_TO_PROTOCOL' as EdgeType, 'ACTIVE', { validFrom: T0 }));
  createTemporalState(makeCreate('edge_f2', 'WALLET_INTERACTS_WITH_PROTOCOL' as EdgeType, 'ACTIVE', { validFrom: T0 }));
  createTemporalState(makeCreate('edge_f3', 'UNLOCK_IMPACTS_FLOAT' as EdgeType, 'PROVISIONAL', { validFrom: T0 }));

  applyTemporalTransition({ edgeId: 'edge_f2', toStatus: 'STALE', reasonCodes: ['FRESHNESS_DEGRADED'], triggeredAt: T2 });
  applyTemporalTransition({ edgeId: 'edge_f3', toStatus: 'ACTIVE', reasonCodes: ['EVENT_STARTED'], triggeredAt: T1 });
  applyTemporalTransition({ edgeId: 'edge_f3', toStatus: 'EXPIRED', reasonCodes: ['EVENT_ENDED'], triggeredAt: T3 });

  const atT0 = getTemporalStateForEdgeAtTime('edge_f1', T0);
  ok('F1', !!atT0, 'Edge state at T0 retrievable');
  ok('F2', atT0!.status === 'ACTIVE', 'Edge f1 was ACTIVE at T0');

  const walletAtT1 = getTemporalStateForEdgeAtTime('edge_f2', T1);
  ok('F3', walletAtT1!.status === 'ACTIVE', 'Wallet edge was ACTIVE at T1');

  const walletAtT3 = getTemporalStateForEdgeAtTime('edge_f2', T3);
  ok('F4', walletAtT3!.status === 'STALE', 'Wallet edge was STALE at T3');

  const eventAtT0 = getTemporalStateForEdgeAtTime('edge_f3', T0);
  ok('F5', eventAtT0!.status === 'PROVISIONAL', 'Event edge was PROVISIONAL at T0');

  const eventAtT2 = getTemporalStateForEdgeAtTime('edge_f3', T2);
  ok('F6', eventAtT2!.status === 'ACTIVE', 'Event edge was ACTIVE at T2');

  const eventAtT4 = getTemporalStateForEdgeAtTime('edge_f3', T4);
  ok('F7', eventAtT4!.status === 'EXPIRED', 'Event edge was EXPIRED at T4');

  const activeAtT1 = getActiveEdgesAtTime(T1);
  ok('F8', activeAtT1.length >= 2, 'At least 2 active edges at T1');

  const staleAtT3 = getEdgesByTemporalStatusAtTime('STALE', T3);
  ok('F9', staleAtT3.some(r => r.edgeId === 'edge_f2'), 'Wallet edge in stale slice at T3');

  const graphAtT1 = reconstructGraphStateAtTime(T1);
  ok('F10', graphAtT1.active.length >= 2, 'Graph at T1 has 2+ active edges');
  ok('F11', graphAtT1.provisional.length >= 0, 'Graph at T1 provisional slice exists');

  const graphAtT3 = reconstructGraphStateAtTime(T3);
  ok('F12', graphAtT3.stale.some(r => r.edgeId === 'edge_f2'), 'Graph at T3 has stale wallet edge');
  ok('F13', graphAtT3.expired.some(r => r.edgeId === 'edge_f3'), 'Graph at T3 has expired event edge');

  createTemporalState(makeCreate('edge_f4', 'PROTOCOL_HAS_COMPETITOR' as EdgeType, 'CONTESTED', {
    validFrom: T1,
    contestedWindow: { startedAt: T1, reasonCodes: ['DISPUTE'], conflictingEvidenceRefs: ['ev_y'] },
  }));
  const contestedAtT2 = getEdgesByTemporalStatusAtTime('CONTESTED', T2);
  ok('F14', contestedAtT2.some(r => r.edgeId === 'edge_f4'), 'Contested edge in contested slice at T2');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE G — RIGHTS NARROWING
// ═══════════════════════════════════════════════════════════════════════════════

function suiteG(): void {
  console.log('\n--- Suite G: Rights Narrowing ---');
  freshState();

  const activeRights = getTemporalRightsNarrowing('ACTIVE');
  ok('G1', activeRights.propagation === 'ALLOW', 'ACTIVE allows propagation');
  ok('G2', activeRights.judgmentSupport === 'ALLOW', 'ACTIVE allows judgment');
  ok('G3', activeRights.contextEnrichment === 'ALLOW', 'ACTIVE allows context');

  const provisionalRights = getTemporalRightsNarrowing('PROVISIONAL');
  ok('G4', provisionalRights.propagation === 'CONDITIONAL', 'PROVISIONAL narrows propagation');
  ok('G5', provisionalRights.judgmentSupport === 'CONDITIONAL', 'PROVISIONAL narrows judgment');
  ok('G6', provisionalRights.contextEnrichment === 'ALLOW', 'PROVISIONAL preserves context');

  const staleRights = getTemporalRightsNarrowing('STALE');
  ok('G7', staleRights.propagation === 'DENY', 'STALE denies propagation');
  ok('G8', staleRights.judgmentSupport === 'CONDITIONAL', 'STALE narrows judgment to CONDITIONAL');
  ok('G9', staleRights.contextEnrichment === 'ALLOW_WITH_SCAR', 'STALE scars context');

  const expiredRights = getTemporalRightsNarrowing('EXPIRED');
  ok('G10', expiredRights.propagation === 'DENY', 'EXPIRED denies propagation');
  ok('G11', expiredRights.judgmentSupport === 'DENY', 'EXPIRED denies judgment');
  ok('G12', expiredRights.contextEnrichment === 'CONDITIONAL', 'EXPIRED conditional context (forensic)');

  const historicalRights = getTemporalRightsNarrowing('HISTORICAL');
  ok('G13', historicalRights.propagation === 'DENY', 'HISTORICAL denies propagation');
  ok('G14', historicalRights.judgmentSupport === 'DENY', 'HISTORICAL denies judgment');
  ok('G15', historicalRights.contextEnrichment === 'DENY', 'HISTORICAL denies live context');

  const contestedRights = getTemporalRightsNarrowing('CONTESTED');
  ok('G16', contestedRights.propagation === 'DENY', 'CONTESTED denies propagation');
  ok('G17', contestedRights.judgmentSupport === 'CONDITIONAL', 'CONTESTED narrows judgment');
  ok('G18', contestedRights.contextEnrichment === 'ALLOW_WITH_SCAR', 'CONTESTED scars context');

  createTemporalState(makeCreate('edge_g1', 'NARRATIVE_AFFECTS_ASSET' as EdgeType, 'ACTIVE'));
  const activeState = getTemporalStateForEdge('edge_g1')!;
  ok('G19', activeState.activeRightsSnapshot.propagation === 'ALLOW', 'Stored snapshot matches ACTIVE');

  applyTemporalTransition({ edgeId: 'edge_g1', toStatus: 'STALE', reasonCodes: ['DECAY'], triggeredAt: T3 });
  const staleState = getTemporalStateForEdge('edge_g1')!;
  ok('G20', staleState.activeRightsSnapshot.propagation === 'DENY', 'Stored snapshot updated on transition to STALE');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE H — ANTI-FAKE
// ═══════════════════════════════════════════════════════════════════════════════

function suiteH(): void {
  console.log('\n--- Suite H: Anti-Fake ---');
  freshState();

  createTemporalState(makeCreate('edge_h1', 'WALLET_INTERACTS_WITH_PROTOCOL' as EdgeType, 'ACTIVE', {
    lastConfirmedAt: T0,
  }));
  const walletState = getTemporalStateForEdge('edge_h1')!;
  ok('H1', !!walletState.staleAt, 'Rolling wallet edge has staleAt');
  ok('H2', !!walletState.expireAt, 'Rolling wallet edge has expireAt');

  const walletEval = evaluateTemporalTransition({
    edgeId: 'edge_h1', recencyBand: 'EXPIRED', lastConfirmedAt: T0, currentTime: T5,
  });
  ok('H3', walletEval !== null, 'Stale wallet edge triggers transition');
  ok('H4', walletEval!.toStatus === 'STALE' || walletEval!.toStatus === 'EXPIRED', 'Wallet edge must transition off ACTIVE');

  createTemporalState(makeCreate('edge_h2', 'UNLOCK_IMPACTS_FLOAT' as EdgeType, 'ACTIVE', {
    lastConfirmedAt: T0,
    eventWindow: { startAt: T0, endAt: T1 },
  }));
  const eventEval = evaluateTemporalTransition({
    edgeId: 'edge_h2', recencyBand: 'EXPIRED', lastConfirmedAt: T0, currentTime: T5,
  });
  ok('H5', eventEval !== null, 'Event edge after window triggers transition');
  ok('H6', eventEval!.toStatus === 'EXPIRED' || eventEval!.toStatus === 'STALE', 'Event edge cannot remain ACTIVE');

  createTemporalState(makeCreate('edge_h3', 'NARRATIVE_AFFECTS_ASSET' as EdgeType, 'ACTIVE', {
    lastConfirmedAt: T0,
  }));
  const narrativeDecay = computeDecayFactor(getTemporalStateForEdge('edge_h3')!, T5);
  ok('H7', narrativeDecay < 0.5, 'Narrative edge decays over time');

  const narrativeEval = evaluateTemporalTransition({
    edgeId: 'edge_h3', recencyBand: 'STALE', lastConfirmedAt: T0, currentTime: T5,
  });
  ok('H8', narrativeEval !== null, 'Narrative edge eventually triggers stale transition');

  createTemporalState(makeCreate('edge_h4', 'ASSET_BELONGS_TO_PROTOCOL' as EdgeType, 'ACTIVE', { validFrom: T0 }));
  applyTemporalTransition({ edgeId: 'edge_h4', toStatus: 'STALE', reasonCodes: ['TEST'], triggeredAt: T2 });
  applyTemporalTransition({ edgeId: 'edge_h4', toStatus: 'EXPIRED', reasonCodes: ['TEST'], triggeredAt: T3 });
  applyTemporalTransition({ edgeId: 'edge_h4', toStatus: 'HISTORICAL', reasonCodes: ['ARCHIVED'], triggeredAt: T4 });

  const pastSlice = reconstructGraphStateAtTime(T1);
  const currentSlice = reconstructGraphStateAtTime(T5);
  ok('H9', pastSlice.active.some(r => r.edgeId === 'edge_h4'), 'Past graph correctly shows edge as ACTIVE at T1');
  ok('H10', !currentSlice.active.some(r => r.edgeId === 'edge_h4'), 'Current graph does not show historical edge as ACTIVE');
  ok('H11', currentSlice.historical.some(r => r.edgeId === 'edge_h4'), 'Current graph preserves edge as HISTORICAL');

  createTemporalState(makeCreate('edge_h5', 'PROTOCOL_HAS_COMPETITOR' as EdgeType, 'ACTIVE', { validFrom: T0 }));
  const conflictResult = evaluateTemporalTransition({
    edgeId: 'edge_h5', recencyBand: 'FRESH', lastConfirmedAt: T1, currentTime: T3,
    conflictSignal: true, conflictRefs: ['ev_conflict_1'],
  });
  ok('H12', conflictResult !== null, 'Conflict signal triggers transition');
  ok('H13', conflictResult!.toStatus === 'CONTESTED', 'Conflict signal moves to CONTESTED');
  ok('H14', !!conflictResult!.contestedWindow, 'Contested window attached');

  if (conflictResult) applyTemporalTransition(conflictResult);
  const contestedSlice = getEdgesByTemporalStatusAtTime('CONTESTED', T3);
  ok('H15', contestedSlice.some(r => r.edgeId === 'edge_h5'), 'Contested edge visible in contested slice');

  const contestedHistory = getTemporalHistoryForEdge('edge_h5');
  ok('H16', contestedHistory.some(h => h.status === 'CONTESTED'), 'Contested period preserved in history');

  const audit = getTransitionsForEdge('edge_h5');
  ok('H17', audit.length >= 1, 'Transition to contested recorded');
  const trEvent = emitTemporalTransitionEvent(audit[0]);
  ok('H18', trEvent.eventType === 'TEMPORAL_TRANSITION', 'Audit event type correct');
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
suiteH();

console.log(`\n${'═'.repeat(60)}`);
console.log(`L4.3 Temporal Graph State — TOTAL: ${passed + failed} | ✅ ${passed} | ❌ ${failed}`);
console.log(`${'═'.repeat(60)}`);
if (failed > 0) process.exit(1);
