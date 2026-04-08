/**
 * L2.6 — Per-Request Traceability Test Suite
 *
 * Request traces · Route traces · Envelope traces · Blind spots ·
 * Lineage packs · Graph invariants · Counterfactual analysis ·
 * Route scars · Survival semantics · Anti-fake honesty
 */

import {
  L26_VERSION,
  type RouteTrace, type EnvelopeTrace, type BlindSpotTrace,
  addNode, addEdge,
  getNode, getNodesOfKind, getEdgesFrom, getEdgesTo, getEdgesOfKind,
  getNodeCount, getEdgeCount, validateGraphInvariants, resetTraceGraph,
} from '../services/connector-layer/trace-graph';
import {
  openRequestTrace, recordRouteTrace, recordEnvelopeTrace,
  recordBlindSpotTrace, finalizeRequestTrace,
  getRequestTrace, getRouteTrace, getEnvelopeTrace,
  getAllRequestTraces, getRouteTracesForRequest,
  getEnvelopeTracesForRequest, getBlindSpotTracesForRequest,
  resetTraceBuilder,
} from '../services/connector-layer/request-trace-builder';
import {
  buildRouteTrace, analyzeCounterfactual, detectRouteScars,
  type RouteTraceInput,
} from '../services/connector-layer/route-trace-recorder';
import {
  buildLineagePack, storeLineagePack, getLineagePack,
  getLineagePackByTrace, resetLineagePackStore,
  verifyLineagePackHonesty,
  type LineagePack,
} from '../services/connector-layer/lineage-pack';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

let pass = 0;
let fail = 0;
const failures: string[] = [];

function assert(cond: boolean, label: string) {
  if (cond) { pass++; }
  else { fail++; failures.push(label); console.error(`  ✗ ${label}`); }
}

function section(name: string) { console.log(`\n── ${name} ──`); }

let counter = 0;
function uid(prefix: string): string { return `${prefix}-${++counter}`; }

const NOW = '2026-01-15T12:00:00.000Z';

function resetAll() {
  resetTraceGraph();
  resetTraceBuilder();
  resetLineagePackStore();
}

function makeRouteTraceInput(traceId: string, requestId: string, overrides?: Partial<RouteTraceInput>): RouteTraceInput {
  return {
    requestId,
    traceId,
    fieldFamily: 'price.spot.canonical',
    sourceClass: 'MARKET_AGGREGATOR',
    claimUsage: 'LIVE_SCORING',
    selectedRouteId: uid('route'),
    selectedRouteMode: 'REALTIME',
    selectedConnector: 'cg-ws-01',
    truthFidelityScore: 0.92,
    freshnessFitnessScore: 0.88,
    failureResilienceScore: 0.80,
    costDisciplineScore: 0.70,
    provenanceScore: 0.85,
    routeState: 'R0_PREFERRED',
    ...overrides,
  };
}

function makeEnvelopeTrace(traceId: string, requestId: string, routeTraceId: string, overrides?: Partial<EnvelopeTrace>): EnvelopeTrace {
  return {
    envelopeTraceId: uid('et'),
    requestId,
    traceId,
    routeTraceId,
    envelopeId: uid('env'),
    rawPayloadRef: uid('raw://payload'),
    providerId: 'prov-cg',
    sourceClass: 'MARKET_AGGREGATOR',
    fieldFamily: 'price.spot.canonical',
    canonicalCandidateIds: ['btc-canonical'],
    canonicalResolutionState: 'resolved',
    ingressDisposition: 'SURVIVED',
    survivalMode: 'DIRECT_SURVIVOR',
    replayGeneration: 0,
    survivedIntoLineagePack: true,
    reasonCodes: [],
    createdAt: NOW,
    ...overrides,
  };
}

function makeBlindSpotTrace(traceId: string, requestId: string, overrides?: Partial<BlindSpotTrace>): BlindSpotTrace {
  return {
    blindSpotTraceId: uid('bs'),
    requestId,
    traceId,
    sourceClass: 'MARKET_AGGREGATOR',
    blindSpotType: 'OWNER_UNAVAILABLE',
    severity: 'MEDIUM',
    disclosureRequired: true,
    reasonCodes: ['OWNER_TIMEOUT'],
    createdAt: NOW,
    ...overrides,
  };
}

resetAll();

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n════════════════════════════════════════════════════════════════');
console.log('  L2.6 — PER-REQUEST TRACEABILITY');
console.log('  Constitutional verification suite');
console.log('════════════════════════════════════════════════════════════════');

// ── 1. Version ──────────────────────────────────────────────────────────────
section('1. Version');
assert(L26_VERSION === '1.0.0', 'L26_VERSION is 1.0.0');

// ── 2. Open request trace ───────────────────────────────────────────────────
section('2. Open request trace');
const req1 = openRequestTrace({
  requestKind: 'USER_QUERY',
  requestIntention: 'LIVE_THESIS',
  requestedEntities: ['btc', 'eth'],
  requestedFieldFamilies: ['price.spot.canonical', 'derivatives.funding.aggregate'],
});
assert(req1.traceId.startsWith('trace-'), 'Trace ID prefixed');
assert(req1.requestId.startsWith('req-'), 'Request ID prefixed');
assert(req1.requestKind === 'USER_QUERY', 'Request kind set');
assert(req1.requestIntention === 'LIVE_THESIS', 'Intention set');
assert(req1.requestedEntities.length === 2, 'Entities recorded');
assert(req1.requestedFieldFamilies.length === 2, 'Field families recorded');

// ── 3. Graph node created for request ───────────────────────────────────────
section('3. Graph node for request');
const reqNode = getNode(req1.requestId);
assert(reqNode != null, 'Request node exists');
assert(reqNode!.nodeKind === 'REQUEST', 'Node kind = REQUEST');

// ── 4. Build and record route trace ─────────────────────────────────────────
section('4. Build and record route trace');
const rt1 = buildRouteTrace(makeRouteTraceInput(req1.traceId, req1.requestId, {
  rejectedCandidates: [
    { routeMode: 'SCHEDULED', connector: 'cg-poll', truthFidelityScore: 0.6,
      freshnessFitnessScore: 0.5, failureResilienceScore: 0.9, costDisciplineScore: 0.95,
      compositeScore: 0.65, rejectionReasons: ['FRESHNESS_INSUFFICIENT'] },
  ],
  fallbackLadder: [
    { position: 1, routeMode: 'ON_DEMAND', connector: 'cg-api', expectedBlindSpots: [], expectedDegradation: 'LATENCY_INCREASE' },
  ],
}));
assert(rt1.routeTraceId.startsWith('rt-'), 'Route trace ID prefixed');
assert(rt1.rejectedCandidates.length === 1, 'One rejected candidate');
assert(rt1.bestRejectedRoute != null, 'Best rejected route captured');
assert(rt1.fallbackLadder.length === 1, 'One fallback step');
recordRouteTrace(rt1);

// ── 5. Route trace linked to request ────────────────────────────────────────
section('5. Route trace linked to request');
const updated1 = getRequestTrace(req1.traceId)!;
assert(updated1.routeTraceIds.includes(rt1.routeTraceId), 'Route linked to request');
assert(getRouteTrace(rt1.routeTraceId) != null, 'Route trace queryable');

// ── 6. Graph nodes for route ────────────────────────────────────────────────
section('6. Graph nodes for route');
const rtNode = getNode(rt1.routeTraceId);
assert(rtNode != null, 'Route decision node exists');
assert(rtNode!.nodeKind === 'ROUTE_DECISION', 'Node kind = ROUTE_DECISION');
const rejectedNodes = getNodesOfKind('ROUTE_CANDIDATE');
assert(rejectedNodes.length >= 1, 'Rejected candidate nodes exist');
const rejEdges = getEdgesOfKind('REJECTED_ROUTE');
assert(rejEdges.length >= 1, 'REJECTED_ROUTE edges exist');

// ── 7. Record surviving envelope ────────────────────────────────────────────
section('7. Record surviving envelope');
const et1 = makeEnvelopeTrace(req1.traceId, req1.requestId, rt1.routeTraceId, {
  normalizedArtifactRef: 'norm://art-1',
});
recordEnvelopeTrace(et1);
assert(getEnvelopeTrace(et1.envelopeTraceId) != null, 'Envelope trace queryable');
const envNode = getNode(et1.envelopeTraceId);
assert(envNode != null, 'Envelope node exists');
assert(envNode!.nodeKind === 'ENVELOPE', 'Node kind = ENVELOPE');

// ── 8. Envelope graph edges ─────────────────────────────────────────────────
section('8. Envelope graph edges');
const envEdges = getEdgesFrom(et1.envelopeTraceId);
assert(envEdges.some(e => e.edgeKind === 'INGESTED_AS'), 'INGESTED_AS edge');
assert(envEdges.some(e => e.edgeKind === 'NORMALIZED_FROM'), 'NORMALIZED_FROM edge');

// ── 9. Record deduped envelope ──────────────────────────────────────────────
section('9. Record deduped envelope');
const etDup = makeEnvelopeTrace(req1.traceId, req1.requestId, rt1.routeTraceId, {
  ingressDisposition: 'DEDUPED',
  survivalMode: 'NON_SURVIVOR',
  survivedIntoLineagePack: false,
});
recordEnvelopeTrace(etDup);
const dupEdges = getEdgesFrom(etDup.envelopeTraceId);
assert(dupEdges.some(e => e.edgeKind === 'DEDUPED_AGAINST'), 'DEDUPED_AGAINST edge');

// ── 10. Record corrected envelope ───────────────────────────────────────────
section('10. Record corrected envelope');
const etCorr = makeEnvelopeTrace(req1.traceId, req1.requestId, rt1.routeTraceId, {
  ingressDisposition: 'CORRECTED',
  survivalMode: 'SURVIVOR_AFTER_CORRECTION',
  correctionTargetEnvelopeId: 'prior-env-001',
  survivedIntoLineagePack: true,
});
recordEnvelopeTrace(etCorr);
const corrEdges = getEdgesFrom(etCorr.envelopeTraceId);
assert(corrEdges.some(e => e.edgeKind === 'CORRECTS'), 'CORRECTS edge');

// ── 11. Record replay-isolated envelope ─────────────────────────────────────
section('11. Record replay-isolated envelope');
const etReplay = makeEnvelopeTrace(req1.traceId, req1.requestId, rt1.routeTraceId, {
  ingressDisposition: 'REPLAY_ISOLATED',
  survivalMode: 'NON_SURVIVOR',
  survivedIntoLineagePack: false,
  replayGeneration: 2,
});
recordEnvelopeTrace(etReplay);
const replayEdges = getEdgesFrom(etReplay.envelopeTraceId);
assert(replayEdges.some(e => e.edgeKind === 'ISOLATED_AS_REPLAY'), 'ISOLATED_AS_REPLAY edge');

// ── 12. Record blind spot ───────────────────────────────────────────────────
section('12. Record blind spot');
const bs1 = makeBlindSpotTrace(req1.traceId, req1.requestId, {
  relatedRouteTraceId: rt1.routeTraceId,
  blindSpotType: 'ROUTE_DEGRADED',
  severity: 'HIGH',
});
recordBlindSpotTrace(bs1);
const bsNode = getNode(bs1.blindSpotTraceId);
assert(bsNode != null, 'Blind spot node exists');
assert(bsNode!.nodeKind === 'BLIND_SPOT', 'Node kind = BLIND_SPOT');
const bsEdges = getEdgesTo(bs1.blindSpotTraceId);
assert(bsEdges.some(e => e.edgeKind === 'INTRODUCED_BLIND_SPOT'), 'INTRODUCED_BLIND_SPOT edge');

// ── 13. Finalize request trace ──────────────────────────────────────────────
section('13. Finalize request trace');
const pack = finalizeRequestTrace(req1.traceId);
assert(pack.lineagePackId.startsWith('lp-'), 'Lineage pack ID prefixed');
assert(pack.survivingEnvelopeIds.length >= 1, 'Has survivors');
assert(pack.dedupedEnvelopeIds.length === 1, 'One deduped');
assert(pack.correctedEnvelopeIds.length === 1, 'One corrected');
assert(pack.replayIsolatedEnvelopeIds.length === 1, 'One replay isolated');
assert(pack.blindSpotTraceIds.length >= 1, 'Has blind spots');

// ── 14. Request trace sealed ────────────────────────────────────────────────
section('14. Request trace sealed');
const sealed = getRequestTrace(req1.traceId)!;
assert(sealed.sealedAt != null, 'Sealed timestamp set');
assert(sealed.lineagePackId === pack.lineagePackId, 'Pack linked to request');
assert(sealed.finalIngressSummary != null, 'Summary computed');
assert(sealed.finalIngressSummary!.survivingEnvelopes >= 1, 'Summary: survivors');
assert(sealed.finalIngressSummary!.blindSpots >= 1, 'Summary: blind spots');
assert(sealed.finalIngressSummary!.traceConfidence >= 0, 'Trace confidence computed');
assert(sealed.finalIngressSummary!.traceConfidence <= 1, 'Confidence <= 1');

// ── 15. Lineage pack content ────────────────────────────────────────────────
section('15. Lineage pack content');
assert(pack.targetedEntities.includes('btc'), 'Targeted entity preserved');
assert(pack.targetedFieldFamilies.includes('price.spot.canonical'), 'Targeted family preserved');
assert(pack.supportingRawPayloadRefs.length >= 1, 'Raw payload refs in pack');
assert(pack.supportingNormalizedArtifactRefs.length >= 1, 'Normalized refs in pack');
assert(pack.canonicalEntityTargets.length >= 1, 'Canonical targets in pack');

// ── 16. Lineage pack store ──────────────────────────────────────────────────
section('16. Lineage pack store');
storeLineagePack(pack);
assert(getLineagePack(pack.lineagePackId) != null, 'Stored and retrievable');
assert(getLineagePackByTrace(req1.traceId) != null, 'Queryable by trace');

// ── 17. Graph invariant validation — complete trace ─────────────────────────
section('17. Graph invariants — complete trace');
const invariantViolations = validateGraphInvariants(req1.traceId);
assert(invariantViolations.length === 0, 'No invariant violations');

// ── 18. Counterfactual analysis ─────────────────────────────────────────────
section('18. Counterfactual analysis');
const cf = analyzeCounterfactual(rt1);
assert(typeof cf.betterRouteExisted === 'boolean', 'Better route flag');
assert(typeof cf.fidelityDelta === 'number', 'Fidelity delta');
assert(typeof cf.freshnessDelta === 'number', 'Freshness delta');
assert(cf.selectedComposite > 0, 'Selected composite positive');

// ── 19. Route scar detection ────────────────────────────────────────────────
section('19. Route scar detection');
const degradedRt = buildRouteTrace(makeRouteTraceInput(req1.traceId, req1.requestId, {
  routeState: 'R2_DEGRADED',
  fallbackLadder: [
    { position: 1, routeMode: 'SCHEDULED', connector: 'cg-poll', expectedBlindSpots: ['SEQUENCE_GAP'] },
    { position: 2, routeMode: 'ON_DEMAND', connector: 'cg-api', expectedBlindSpots: [] },
    { position: 3, routeMode: 'BACKFILL', connector: 'cg-hist', expectedBlindSpots: ['HISTORICAL_ONLY'] },
  ],
  routeProbationState: 'RECOVERING_PROBATION',
  blindSpotFlags: ['ORDERING_GAP', 'PARTIAL_FIELD_MISSING', 'SEQUENCE_UNCERTAINTY'],
}));
const scars = detectRouteScars(degradedRt);
assert(scars.length >= 3, 'Multiple scars detected');
assert(scars.some(s => s.scarType === 'DEGRADED_ROUTE'), 'Degraded route scar');
assert(scars.some(s => s.scarType === 'FALLBACK_USED'), 'Fallback scar');
assert(scars.some(s => s.scarType === 'PROBATION_ACTIVE'), 'Probation scar');
assert(scars.some(s => s.scarType === 'BLIND_SPOTS_PRESENT'), 'Blind spots scar');

// ── 20. Counterfactual — better route existed ───────────────────────────────
section('20. Counterfactual — better route existed');
const rtWithBetter = buildRouteTrace(makeRouteTraceInput(req1.traceId, req1.requestId, {
  truthFidelityScore: 0.5,
  freshnessFitnessScore: 0.4,
  failureResilienceScore: 0.3,
  costDisciplineScore: 0.9,
  rejectedCandidates: [
    { routeMode: 'REALTIME', connector: 'alt-ws', truthFidelityScore: 0.95,
      freshnessFitnessScore: 0.90, failureResilienceScore: 0.85, costDisciplineScore: 0.60,
      compositeScore: 0.87, rejectionReasons: ['COST_EXCEEDED_BUDGET'] },
  ],
}));
const cf2 = analyzeCounterfactual(rtWithBetter);
assert(cf2.betterRouteExisted === true, 'Better route detected');
assert(cf2.fidelityDelta > 0, 'Positive fidelity delta');
assert(cf2.bestRejectedComposite > cf2.selectedComposite, 'Rejected had higher composite');

// ── 21. Request trace queries ───────────────────────────────────────────────
section('21. Request trace queries');
assert(getAllRequestTraces().length >= 1, 'All request traces queryable');
assert(getRouteTracesForRequest(req1.traceId).length >= 1, 'Route traces for request');
assert(getEnvelopeTracesForRequest(req1.traceId).length >= 1, 'Envelope traces for request');
assert(getBlindSpotTracesForRequest(req1.traceId).length >= 1, 'Blind spot traces for request');

// ── 22. Full graph — second request ─────────────────────────────────────────
section('22. Full graph — second request');
const req2 = openRequestTrace({
  requestKind: 'BACKGROUND_REFRESH',
  requestIntention: 'LIVE_DISPLAY',
  requestedEntities: ['sol'],
  requestedFieldFamilies: ['protocol.tvl.usd'],
});
const rt2 = buildRouteTrace(makeRouteTraceInput(req2.traceId, req2.requestId, {
  selectedRouteMode: 'SCHEDULED',
  selectedConnector: 'dl-poll',
  fieldFamily: 'protocol.tvl.usd',
}));
recordRouteTrace(rt2);
const et2 = makeEnvelopeTrace(req2.traceId, req2.requestId, rt2.routeTraceId, {
  fieldFamily: 'protocol.tvl.usd',
});
recordEnvelopeTrace(et2);
const pack2 = finalizeRequestTrace(req2.traceId);
assert(pack2.survivingEnvelopeIds.length === 1, 'Second request: one survivor');
assert(getAllRequestTraces().length >= 2, 'Two request traces');

// ── 23. Suppressed envelope not in survivor list ────────────────────────────
section('23. Suppressed envelope exclusion');
resetAll();
const req3 = openRequestTrace({
  requestKind: 'ALERT_EVALUATION',
  requestIntention: 'LIVE_THESIS',
  requestedEntities: ['eth'],
  requestedFieldFamilies: ['derivatives.funding.aggregate'],
});
const rt3 = buildRouteTrace(makeRouteTraceInput(req3.traceId, req3.requestId));
recordRouteTrace(rt3);
const etSurv = makeEnvelopeTrace(req3.traceId, req3.requestId, rt3.routeTraceId);
recordEnvelopeTrace(etSurv);
const etSupp = makeEnvelopeTrace(req3.traceId, req3.requestId, rt3.routeTraceId, {
  ingressDisposition: 'SUPPRESSED',
  survivalMode: 'NON_SURVIVOR',
  survivedIntoLineagePack: false,
});
recordEnvelopeTrace(etSupp);
const pack3 = finalizeRequestTrace(req3.traceId);
assert(pack3.survivingEnvelopeIds.includes(etSurv.envelopeTraceId), 'Survivor in pack');
assert(!pack3.survivingEnvelopeIds.includes(etSupp.envelopeTraceId), 'Suppressed not in survivors');
assert(pack3.suppressedEnvelopeIds.includes(etSupp.envelopeTraceId), 'Suppressed tracked separately');

// ── 24. Route blind spots become graph nodes ────────────────────────────────
section('24. Route blind spots → graph nodes');
resetAll();
const req4 = openRequestTrace({
  requestKind: 'USER_QUERY',
  requestIntention: 'DEEP_VERIFICATION',
  requestedEntities: ['jto'],
  requestedFieldFamilies: ['price.spot.canonical'],
});
const rt4 = buildRouteTrace(makeRouteTraceInput(req4.traceId, req4.requestId, {
  blindSpotFlags: ['ORDERING_GAP', 'PARTIAL_FIELD_MISSING'],
}));
recordRouteTrace(rt4);
const bsNodes = getNodesOfKind('BLIND_SPOT');
assert(bsNodes.length >= 2, 'Two blind spot nodes from route flags');

// ── 25. Graph node count ────────────────────────────────────────────────────
section('25. Graph metrics');
assert(getNodeCount() > 0, 'Nodes exist');
assert(getEdgeCount() > 0, 'Edges exist');

// ═══════════════════════════════════════════════════════════════════════════════
// ANTI-FAKE: request-lineage-honesty
// ═══════════════════════════════════════════════════════════════════════════════

// ── 26. ANTI-FAKE: honest lineage pack ──────────────────────────────────────
section('26. ANTI-FAKE: honest lineage pack');
resetAll();
const reqH = openRequestTrace({
  requestKind: 'USER_QUERY', requestIntention: 'LIVE_THESIS',
  requestedEntities: ['btc'], requestedFieldFamilies: ['price.spot.canonical'],
});
const rtH = buildRouteTrace(makeRouteTraceInput(reqH.traceId, reqH.requestId));
recordRouteTrace(rtH);
const etH = makeEnvelopeTrace(reqH.traceId, reqH.requestId, rtH.routeTraceId);
recordEnvelopeTrace(etH);
const bsH = makeBlindSpotTrace(reqH.traceId, reqH.requestId, { relatedRouteTraceId: rtH.routeTraceId });
recordBlindSpotTrace(bsH);
const packH = finalizeRequestTrace(reqH.traceId);

const envTraces = getEnvelopeTracesForRequest(reqH.traceId);
const bsTraces = getBlindSpotTracesForRequest(reqH.traceId);
const honesty = verifyLineagePackHonesty(packH, envTraces, bsTraces);
assert(honesty.length === 0, 'Honest pack passes verification');

// ── 27. ANTI-FAKE: survivor missing from pack ──────────────────────────────
section('27. ANTI-FAKE: survivor missing from pack');
const fakePack: LineagePack = {
  ...packH,
  survivingEnvelopeIds: [],
};
const fakeSurvivorCheck = verifyLineagePackHonesty(fakePack, envTraces, bsTraces);
assert(fakeSurvivorCheck.some(v => v.includes('SURVIVOR_MISSING')), 'Missing survivor detected');

// ── 28. ANTI-FAKE: deduped treated as survivor ─────────────────────────────
section('28. ANTI-FAKE: deduped as survivor');
resetAll();
const reqF = openRequestTrace({
  requestKind: 'USER_QUERY', requestIntention: 'LIVE_THESIS',
  requestedEntities: ['btc'], requestedFieldFamilies: ['price.spot.canonical'],
});
const rtF = buildRouteTrace(makeRouteTraceInput(reqF.traceId, reqF.requestId));
recordRouteTrace(rtF);
const etDeduped = makeEnvelopeTrace(reqF.traceId, reqF.requestId, rtF.routeTraceId, {
  ingressDisposition: 'DEDUPED',
  survivalMode: 'NON_SURVIVOR',
  survivedIntoLineagePack: false,
});
recordEnvelopeTrace(etDeduped);
const packF = finalizeRequestTrace(reqF.traceId);
const dishonestPack: LineagePack = {
  ...packF,
  survivingEnvelopeIds: [etDeduped.envelopeTraceId],
};
const dedupCheck = verifyLineagePackHonesty(
  dishonestPack,
  getEnvelopeTracesForRequest(reqF.traceId),
  [],
);
assert(dedupCheck.some(v => v.includes('DEDUPED_TREATED_AS_SURVIVOR')), 'Deduped-as-survivor detected');

// ── 29. ANTI-FAKE: blind spot missing from pack ───────────────────────────
section('29. ANTI-FAKE: blind spot missing');
const missingBsPack: LineagePack = {
  ...packH,
  blindSpotTraceIds: [],
};
const bsMissing = verifyLineagePackHonesty(missingBsPack, envTraces, bsTraces);
assert(bsMissing.some(v => v.includes('BLIND_SPOT_MISSING')), 'Missing blind spot detected');

// ── 30. ANTI-FAKE: graph invariant — orphan blind spot ─────────────────────
section('30. ANTI-FAKE: graph invariant — orphan blind spot');
resetAll();
const reqOrphan = openRequestTrace({
  requestKind: 'USER_QUERY', requestIntention: 'LIVE_THESIS',
  requestedEntities: ['btc'], requestedFieldFamilies: ['price.spot.canonical'],
});
addNode({
  nodeId: 'orphan-bs',
  nodeKind: 'BLIND_SPOT',
  traceId: reqOrphan.traceId,
  metadata: {},
  createdAt: NOW,
});
const orphanCheck = validateGraphInvariants(reqOrphan.traceId);
assert(orphanCheck.some(v => v.includes('BLIND_SPOT_UNLINKED')), 'Orphan blind spot detected');

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n════════════════════════════════════════════════════════════════');
console.log(`  RESULT: ${pass} passed, ${fail} failed (${pass + fail} total)`);
if (failures.length) {
  console.log('  FAILURES:');
  failures.forEach(f => console.log(`    ✗ ${f}`));
}
console.log('════════════════════════════════════════════════════════════════\n');

process.exit(fail > 0 ? 1 : 0);
