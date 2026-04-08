/**
 * L2.5 — Replay & Forensic Recoverability Test Suite (v2)
 *
 * Raw archive · Replay index · Ingress replay engine · Forensic
 * reconstruction · Backfill reproducibility · Claim lineage ·
 * Version pins · Drift detection · Anti-fake honesty
 */

import { L25_VERSION } from '../services/connector-layer/replay-types';
import type {
  IngressVersionPins, ReplayIndexRecord, BackfillBatchConstitution,
  NormalizedArtifactRecord,
} from '../services/connector-layer/replay-types';
import {
  REPLAY_DOCTRINE,
  captureCurrentVersionPins, validateVersionPins, detectVersionDrift,
  computeReconstructionIntegrity, evaluateReplayPromotion,
} from '../services/connector-layer/replay-constitution';
import {
  archiveRawPayload, readRawPayload, verifyArchiveIntegrity,
  getArchiveSize, getArchiveBySource, getArchiveByBatch, resetArchive,
  type RawPayloadInput,
} from '../services/connector-layer/raw-payload-archive';
import {
  registerInReplayIndex, getByEnvelopeId, getByTraceId, getByBatchId,
  getByRouteId, getByDedupFingerprint, getCorrectionChain,
  getByReplayGeneration, addDownstreamEdge, getLineageEdgesFrom,
  getLineageEdgesTo, getIndexSize, getLineageEdgeCount, resetReplayIndex,
} from '../services/connector-layer/replay-index';
import {
  replaySingleEnvelope, createReplaySession, executeReplaySession,
  getAllReplaySessions, resetIngressReplayEngine, verifyReplayHonesty,
} from '../services/connector-layer/ingress-replay-engine';
import {
  reconstruct, storeNormalizedArtifact, getNormalizedArtifact,
  registerDownstreamClaim, resetNormalizedStore, resetClaimRegistry,
  verifyForensicFaithfulness,
} from '../services/connector-layer/forensic-reconstruction';
import {
  declareBackfillConstitution, getBackfillConstitution,
  checkReproducibility, compareBackfillRuns, verifyBackfillHonesty,
  resetConstitutionRegistry,
} from '../services/connector-layer/backfill-reproducibility';
import { buildForensicSnapshot, resetSnapshotStore } from '../services/connector-layer/forensic-snapshot';
import { L21_PROTOCOL_VERSION } from '../services/connector-layer/constitutional-envelope';
import { L22_VERSION } from '../services/connector-layer/freshness-ontology';
import { L23_VERSION } from '../services/connector-layer/routing-mode-types';
import { L24_VERSION } from '../services/connector-layer/event-fingerprint';

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

function makeRawInput(overrides?: Partial<RawPayloadInput>): RawPayloadInput {
  return {
    blob: { price: 42000, symbol: 'BTC' },
    payloadFormat: 'json',
    source: 'coingecko',
    providerId: 'prov-cg',
    connectorInstanceId: uid('ci'),
    routeId: uid('route'),
    routeMode: 'REALTIME',
    receivedTimestamp: NOW,
    ingestedTimestamp: NOW,
    replayGeneration: 0,
    ...overrides,
  };
}

function makeIndexRecord(overrides?: Partial<ReplayIndexRecord>): ReplayIndexRecord {
  const envId = overrides?.envelopeId ?? uid('env');
  return {
    envelopeId: envId,
    traceId: uid('trace'),
    routeId: uid('route'),
    routeMode: 'REALTIME',
    source: 'coingecko',
    providerId: 'prov-cg',
    sourceClass: 'MARKET_AGGREGATOR',
    fieldFamily: 'price.spot.canonical',
    idempotencyKey: uid('idem'),
    dedupFingerprint: uid('fp'),
    replayGeneration: 0,
    rawPayloadRef: '',
    normalizationVersion: '1.0.0',
    versionPins: captureCurrentVersionPins(),
    blindSpots: [],
    createdAt: NOW,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESET ALL
// ═══════════════════════════════════════════════════════════════════════════════

function resetAll() {
  resetArchive();
  resetReplayIndex();
  resetIngressReplayEngine();
  resetNormalizedStore();
  resetClaimRegistry();
  resetConstitutionRegistry();
  resetSnapshotStore();
}

resetAll();

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n════════════════════════════════════════════════════════════════');
console.log('  L2.5 — REPLAY & FORENSIC RECOVERABILITY (v2)');
console.log('  Constitutional verification suite');
console.log('════════════════════════════════════════════════════════════════');

// ── 1. Version & doctrine ──────────────────────────────────────────────────
section('1. Version & doctrine');
assert(L25_VERSION === '2.0.0', 'L25_VERSION is 2.0.0');
assert(Object.keys(REPLAY_DOCTRINE).length === 6, 'Six doctrine rules');
assert(REPLAY_DOCTRINE.RULE_A.includes('exact ingress path'), 'RULE_A');
assert(REPLAY_DOCTRINE.RULE_F.includes('Version pins'), 'RULE_F');

// ── 2. Version pin capture ────────────────────────────────────────────────
section('2. Version pin capture');
const pins = captureCurrentVersionPins();
assert(pins.envelopeProtocolVersion === L21_PROTOCOL_VERSION, 'L2.1 version');
assert(pins.freshnessOntologyVersion === L22_VERSION, 'L2.2 version');
assert(pins.routingDoctrineVersion === L23_VERSION, 'L2.3 version');
assert(pins.dedupEngineVersion === L24_VERSION, 'L2.4 version');

// ── 3. Version pin validation ─────────────────────────────────────────────
section('3. Version pin validation');
assert(validateVersionPins(pins).valid === true, 'Valid pins pass');
const badPins: IngressVersionPins = { ...pins, envelopeProtocolVersion: '', normalizationVersion: '' };
const badResult = validateVersionPins(badPins);
assert(badResult.valid === false, 'Bad pins fail');
assert(badResult.issues.length === 2, 'Two issues');

// ── 4. Version drift detection ────────────────────────────────────────────
section('4. Version drift detection');
const oldPins = captureCurrentVersionPins({ normalizationVersion: '0.9.0' });
const drifts = detectVersionDrift(oldPins, captureCurrentVersionPins());
assert(drifts.length === 1, 'One drift');
assert(drifts[0].severity === 'CRITICAL', 'Normalization drift critical');
assert(detectVersionDrift(pins, pins).length === 0, 'No drift same pins');

// ── 5. Reconstruction integrity ───────────────────────────────────────────
section('5. Reconstruction integrity');
const fullI = computeReconstructionIntegrity({
  hasEnvelope: true, hasFreshnessDecision: true, hasRoutingDecision: true,
  hasIdentityDecision: true, versionsPinned: true, lineageComplete: true,
  rawPayloadRefExists: true, normalizationVersionExists: true, timingComplete: true,
});
assert(fullI.integrityScore === 1, 'Perfect score');
assert(fullI.rawPayloadRecoverable === true, 'Raw recoverable');
assert(fullI.issues.length === 0, 'No issues');
const emptyI = computeReconstructionIntegrity({
  hasEnvelope: false, hasFreshnessDecision: false, hasRoutingDecision: false,
  hasIdentityDecision: false, versionsPinned: false, lineageComplete: false,
  rawPayloadRefExists: false, normalizationVersionExists: false, timingComplete: false,
});
assert(emptyI.integrityScore === 0, 'Zero score');
assert(emptyI.issues.length === 9, 'All 9 issues');

// ── 6. Replay promotion gates ─────────────────────────────────────────────
section('6. Replay promotion gates');
assert(evaluateReplayPromotion(1, []) === 'ALLOW_LIVE_PROMOTION', 'Full → live');
assert(evaluateReplayPromotion(0.9, [{ field: 'x', originalVersion: '0', currentVersion: '1', severity: 'INFO' }]) === 'ALLOW_DISPLAY_ONLY', 'Minor drift → display');
assert(evaluateReplayPromotion(0.9, [{ field: 'x', originalVersion: '0', currentVersion: '1', severity: 'CRITICAL' }]) === 'BLOCK_VERSION_DRIFT', 'Critical → block');
assert(evaluateReplayPromotion(0.9, [], 'F4_UNUSABLE') === 'BLOCK_STALE_REPLAY', 'Stale → block');
assert(evaluateReplayPromotion(0.3, []) === 'BLOCK_INTEGRITY_FAILURE', 'Low integrity → block');

// ── 7. Raw payload archive — write & read ─────────────────────────────────
section('7. Raw payload archive — write & read');
resetAll();
const writeResult = archiveRawPayload(makeRawInput());
assert(writeResult.rawPayloadRef.startsWith('raw://'), 'Ref prefixed');
assert(writeResult.rawPayloadHash.length === 64, 'SHA256 hash');
assert(writeResult.bytesStored > 0, 'Bytes stored');
const readBack = readRawPayload(writeResult.rawPayloadRef);
assert(readBack != null, 'Readable after write');
assert(readBack!.source === 'coingecko', 'Source preserved');

// ── 8. Raw archive — immutability ─────────────────────────────────────────
section('8. Raw archive — immutability');
const dup = archiveRawPayload(makeRawInput());
assert(dup.bytesStored === 0, 'Duplicate write = 0 bytes');
assert(dup.rawPayloadRef === writeResult.rawPayloadRef, 'Same ref');
assert(getArchiveSize() === 1, 'Still one record');

// ── 9. Raw archive — integrity verify ─────────────────────────────────────
section('9. Raw archive — integrity verify');
const integ = verifyArchiveIntegrity(writeResult.rawPayloadRef);
assert(integ.valid === true, 'Valid integrity');
assert(integ.expectedHash === integ.actualHash, 'Hash matches');
const missing = verifyArchiveIntegrity('raw://nonexistent');
assert(missing.valid === false, 'Missing = invalid');
assert(missing.issues.includes('RECORD_NOT_FOUND'), 'Not found issue');

// ── 10. Raw archive — query by source ─────────────────────────────────────
section('10. Raw archive — query by source');
assert(getArchiveBySource('coingecko').length === 1, 'Query by source works');
assert(getArchiveBySource('unknown').length === 0, 'No results for unknown');

// ── 11. Raw archive — batch query ─────────────────────────────────────────
section('11. Raw archive — batch query');
archiveRawPayload(makeRawInput({ blob: { batch: true }, backfillBatchId: 'batch-001' }));
assert(getArchiveByBatch('batch-001').length === 1, 'Query by batch');
assert(getArchiveSize() === 2, 'Two records now');

// ── 12. Replay index — register & query ───────────────────────────────────
section('12. Replay index — register & query');
resetAll();
const raw = archiveRawPayload(makeRawInput());
const rec = makeIndexRecord({ envelopeId: 'env-001', rawPayloadRef: raw.rawPayloadRef, traceId: 'trace-A' });
registerInReplayIndex(rec);
assert(getByEnvelopeId('env-001') != null, 'Query by envelope');
assert(getByTraceId('trace-A').length === 1, 'Query by trace');
assert(getByRouteId(rec.routeId).length === 1, 'Query by route');
assert(getIndexSize() === 1, 'Index size = 1');

// ── 13. Replay index — correction chain ───────────────────────────────────
section('13. Replay index — correction chain');
const corrRec = makeIndexRecord({ envelopeId: 'env-corr-1', correctionOfEnvelopeId: 'env-001' });
registerInReplayIndex(corrRec);
const chain = getCorrectionChain('env-001');
assert(chain.length === 2, 'Root + correction');
assert(chain.some(c => c.envelopeId === 'env-corr-1'), 'Correction in chain');

// ── 14. Replay index — dedup fingerprint query ───────────────────────────
section('14. Replay index — dedup fingerprint query');
assert(getByDedupFingerprint(rec.dedupFingerprint).length === 1, 'Query by dedup fp');

// ── 15. Replay index — generation query ──────────────────────────────────
section('15. Replay index — generation query');
assert(getByReplayGeneration(0).length >= 1, 'Query by generation');

// ── 16. Lineage graph — auto edges ──────────────────────────────────────
section('16. Lineage graph — auto edges');
assert(getLineageEdgeCount() > 0, 'Lineage edges created');
const fromEnv = getLineageEdgesFrom('env-001');
assert(fromEnv.some(e => e.edgeKind === 'ARRIVED_VIA'), 'ARRIVED_VIA edge');
assert(fromEnv.some(e => e.edgeKind === 'NORMALIZED_FROM'), 'NORMALIZED_FROM edge');
const corrEdges = getLineageEdgesFrom('env-corr-1');
assert(corrEdges.some(e => e.edgeKind === 'CORRECTS'), 'CORRECTS edge');

// ── 17. Lineage graph — downstream edges ────────────────────────────────
section('17. Lineage graph — downstream edges');
addDownstreamEdge('env-001', 'score-001', 'score', 'SUPPORTED');
const toScore = getLineageEdgesTo('score-001');
assert(toScore.length === 1, 'Downstream edge recorded');
assert(toScore[0].edgeKind === 'SUPPORTED', 'SUPPORTED edge kind');

// ── 18. Single envelope replay — success ────────────────────────────────
section('18. Single envelope replay — success');
const result = replaySingleEnvelope('env-001', 'DRY_RUN_AUDIT', captureCurrentVersionPins());
assert(result.success === true, 'Replay succeeds');
assert(result.integrityScore > 0, 'Positive integrity');
assert(result.drifts.length === 0, 'No drift');
assert(result.reconstructedSnapshot != null, 'Snapshot produced');

// ── 19. Single replay — missing envelope ────────────────────────────────
section('19. Single replay — missing envelope');
const missingResult = replaySingleEnvelope('env-nonexistent', 'DRY_RUN_AUDIT', captureCurrentVersionPins());
assert(missingResult.success === false, 'Missing = fail');
assert(missingResult.divergenceReasons.includes('INDEX_RECORD_NOT_FOUND'), 'Not found reason');

// ── 20. Single replay — strict forensic with version drift ──────────────
section('20. Strict forensic with version drift');
const driftedPins = captureCurrentVersionPins({ normalizationVersion: '99.0.0' });
const strictResult = replaySingleEnvelope('env-001', 'STRICT_FORENSIC', driftedPins);
assert(strictResult.success === false, 'Strict fails on drift');
assert(strictResult.divergenceReasons.includes('STRICT_FORENSIC_VERSION_MISMATCH'), 'Version mismatch reason');

// ── 21. Replay session — create & execute ───────────────────────────────
section('21. Replay session — create & execute');
resetIngressReplayEngine();
const session = createReplaySession({
  scope: { envelopeIds: ['env-001'] },
  replayMode: 'DRY_RUN_AUDIT',
  pinnedVersions: captureCurrentVersionPins(),
  replayGeneration: 1,
});
assert(session.status === 'PENDING', 'Starts PENDING');
const executed = executeReplaySession(session.sessionId);
assert(executed.status === 'COMPLETED', 'Completes');
assert(executed.results.totalEnvelopes === 1, 'One envelope');
assert(executed.results.reconstructed === 1, 'Reconstructed');

// ── 22. Replay session — batch by trace ─────────────────────────────────
section('22. Replay session — batch by trace');
const traceSession = createReplaySession({
  scope: { traceId: 'trace-A' },
  replayMode: 'STRUCTURAL_REPLAY',
  pinnedVersions: captureCurrentVersionPins(),
  replayGeneration: 2,
});
const traceResult = executeReplaySession(traceSession.sessionId);
assert(traceResult.results.totalEnvelopes >= 1, 'Trace-scoped replay');

// ── 23. Replay session — empty scope ────────────────────────────────────
section('23. Replay session — empty scope');
const emptySession = createReplaySession({
  scope: {},
  replayMode: 'DRY_RUN_AUDIT',
  pinnedVersions: captureCurrentVersionPins(),
  replayGeneration: 3,
});
const emptyResult = executeReplaySession(emptySession.sessionId);
assert(emptyResult.status === 'COMPLETED', 'Empty scope = completed');
assert(emptyResult.results.totalEnvelopes === 0, 'Zero envelopes');

// ── 24. Normalized artifact store ───────────────────────────────────────
section('24. Normalized artifact store');
const normArt: NormalizedArtifactRecord = {
  envelopeId: 'env-001',
  normalizationVersion: '1.0.0',
  normalizedPayloadFragment: { btcPrice: 42000 },
  canonicalCandidateIds: ['btc-canonical'],
  canonicalResolutionState: 'resolved',
  normalizedFieldLineage: [{
    fragmentId: 'frag-1', fieldId: 'price.spot', sourcePointer: '$.price',
    normalizationRuleId: 'rule-spot', validationResult: 'PASS',
  }],
  suppressedFieldIds: [],
  provisionalFieldIds: [],
  warnings: [],
  replayGeneration: 0,
  createdAt: NOW,
};
storeNormalizedArtifact(normArt);
assert(getNormalizedArtifact('env-001') != null, 'Normalized stored');
assert(getNormalizedArtifact('env-001')!.normalizedFieldLineage.length === 1, 'Field lineage preserved');

// ── 25. Downstream claim registration ───────────────────────────────────
section('25. Downstream claim registration');
registerDownstreamClaim({
  claimId: 'score-001',
  claimType: 'score',
  supportingEnvelopeIds: ['env-001'],
});

// ── 26. Forensic reconstruction by envelope ─────────────────────────────
section('26. Forensic reconstruction by envelope');
const reconEnv = reconstruct({ targetType: 'envelope', targetId: 'env-001' });
assert(reconEnv.ingressArtifacts.length === 1, 'One artifact');
assert(reconEnv.rawPayloadRefs.length === 1, 'One raw ref');
assert(reconEnv.normalizedArtifacts.length === 1, 'One normalized artifact');
assert(reconEnv.explanation.length > 0, 'Explanation produced');
assert(reconEnv.claimLineagePack.supportingEnvelopeIds.length === 1, 'Pack has envelopes');

// ── 27. Forensic reconstruction by trace ────────────────────────────────
section('27. Forensic reconstruction by trace');
const reconTrace = reconstruct({ targetType: 'trace', targetId: 'trace-A' });
assert(reconTrace.ingressArtifacts.length >= 1, 'Trace resolves artifacts');

// ── 28. Forensic reconstruction by claim ────────────────────────────────
section('28. Forensic reconstruction by claim');
const reconClaim = reconstruct({ targetType: 'score', targetId: 'score-001' });
assert(reconClaim.ingressArtifacts.length === 1, 'Claim resolves to envelope');
assert(reconClaim.claimLineagePack.claimId === 'score-001', 'Pack has claim ID');

// ── 29. Reconstruction with correction chain ────────────────────────────
section('29. Reconstruction with correction chain');
resetAll();
const rawCorr = archiveRawPayload(makeRawInput({ blob: { corr: 1 } }));
const rootRec = makeIndexRecord({ envelopeId: 'env-root', rawPayloadRef: rawCorr.rawPayloadRef });
registerInReplayIndex(rootRec);
const corrRec2 = makeIndexRecord({
  envelopeId: 'env-corr-of-root',
  rawPayloadRef: rawCorr.rawPayloadRef,
  correctionOfEnvelopeId: 'env-root',
});
registerInReplayIndex(corrRec2);
const reconCorr = reconstruct({ targetType: 'envelope', targetId: 'env-corr-of-root' });
assert(reconCorr.correctionChains.length >= 1, 'Correction chain detected');
assert(reconCorr.correctionChains[0].chain.length >= 1, 'Chain has entries');

// ── 30. Reconstruction preserves blind spots ────────────────────────────
section('30. Reconstruction preserves blind spots');
resetAll();
const rawBlind = archiveRawPayload(makeRawInput({ blob: { blind: true } }));
const blindRec = makeIndexRecord({
  envelopeId: 'env-blind',
  rawPayloadRef: rawBlind.rawPayloadRef,
  blindSpots: ['ORDERING_GAP', 'PARTIAL_FIELD_MISSING'],
  routeState: 'R2_DEGRADED',
});
registerInReplayIndex(blindRec);
const reconBlind = reconstruct({ targetType: 'envelope', targetId: 'env-blind' });
assert(reconBlind.blindSpotHistory.length === 1, 'Blind spot history');
assert(reconBlind.blindSpotHistory[0].routeBlindSpots.includes('ORDERING_GAP'), 'Ordering gap preserved');
assert(reconBlind.explanation.some(e => e.includes('Blind spot')), 'Explanation mentions blind spots');

// ── 31. Backfill constitution declaration ───────────────────────────────
section('31. Backfill constitution declaration');
resetAll();
const bc: BackfillBatchConstitution = {
  backfillBatchId: 'bf-001',
  sourceSet: ['coingecko', 'coinglass'],
  routeMode: 'BACKFILL',
  startTime: '2026-01-01',
  endTime: '2026-01-31',
  orderingPolicy: 'STRICT_CHRONOLOGICAL',
  pinnedVersions: captureCurrentVersionPins(),
  replayGeneration: 1,
  declaredAt: NOW,
};
declareBackfillConstitution(bc);
assert(getBackfillConstitution('bf-001') != null, 'Constitution stored');

// ── 32. Backfill constitution — no double declare ───────────────────────
section('32. Backfill constitution — no double declare');
let threw = false;
try { declareBackfillConstitution(bc); } catch { threw = true; }
assert(threw, 'Double declaration throws');

// ── 33. Backfill reproducibility — no artifacts ─────────────────────────
section('33. Backfill reproducibility — no artifacts');
const repro1 = checkReproducibility('bf-001');
assert(repro1.constitutionDeclared === true, 'Constitution declared');
assert(repro1.totalArtifacts === 0, 'Zero artifacts');
assert(repro1.reproducible === false, 'Not reproducible without artifacts');

// ── 34. Backfill reproducibility — with matching artifacts ──────────────
section('34. Backfill reproducibility — with matching artifacts');
const bfRaw = archiveRawPayload(makeRawInput({ blob: { bf: 1 }, backfillBatchId: 'bf-001' }));
const bfRec = makeIndexRecord({
  envelopeId: 'env-bf-1',
  rawPayloadRef: bfRaw.rawPayloadRef,
  backfillBatchId: 'bf-001',
  routeMode: 'BACKFILL',
  source: 'coingecko',
  replayGeneration: 1,
});
registerInReplayIndex(bfRec);
const repro2 = checkReproducibility('bf-001');
assert(repro2.totalArtifacts === 1, 'One artifact');
assert(repro2.matchedArtifacts === 1, 'Matched');
assert(repro2.reproducible === true, 'Reproducible');

// ── 35. Backfill reproducibility — version mismatch ─────────────────────
section('35. Backfill reproducibility — version mismatch');
const bfRaw2 = archiveRawPayload(makeRawInput({ blob: { bf: 2 }, backfillBatchId: 'bf-001' }));
const bfRec2 = makeIndexRecord({
  envelopeId: 'env-bf-2',
  rawPayloadRef: bfRaw2.rawPayloadRef,
  backfillBatchId: 'bf-001',
  routeMode: 'BACKFILL',
  source: 'coingecko',
  versionPins: captureCurrentVersionPins({ normalizationVersion: '0.1.0' }),
});
registerInReplayIndex(bfRec2);
const repro3 = checkReproducibility('bf-001');
assert(repro3.mismatchedVersions.length > 0, 'Version mismatch detected');
assert(repro3.reproducible === false, 'Not reproducible');

// ── 36. Backfill reproducibility — no constitution ──────────────────────
section('36. Backfill reproducibility — no constitution');
const repro4 = checkReproducibility('bf-nonexistent');
assert(repro4.constitutionDeclared === false, 'No constitution');
assert(repro4.reproducible === false, 'Not reproducible');

// ── 37. Compare backfill runs ───────────────────────────────────────────
section('37. Compare backfill runs');
resetAll();
const bcA: BackfillBatchConstitution = {
  ...bc, backfillBatchId: 'bf-A',
  pinnedVersions: captureCurrentVersionPins(),
};
const bcB: BackfillBatchConstitution = {
  ...bc, backfillBatchId: 'bf-B',
  pinnedVersions: captureCurrentVersionPins(),
};
declareBackfillConstitution(bcA);
declareBackfillConstitution(bcB);
const cmp1 = compareBackfillRuns('bf-A', 'bf-B');
assert(cmp1.equivalent === true, 'Same constitutions = equivalent');
assert(cmp1.versionDivergences.length === 0, 'No version divergence');

// ── 38. Compare backfill — divergent versions ───────────────────────────
section('38. Compare backfill — divergent versions');
resetAll();
declareBackfillConstitution({ ...bc, backfillBatchId: 'bf-C' });
declareBackfillConstitution({
  ...bc, backfillBatchId: 'bf-D',
  pinnedVersions: captureCurrentVersionPins({ normalizationVersion: '0.5.0' }),
});
const cmp2 = compareBackfillRuns('bf-C', 'bf-D');
assert(cmp2.equivalent === false, 'Different versions = not equivalent');
assert(cmp2.versionDivergences.length > 0, 'Version divergence');

// ── 39. Forensic snapshot builder (v2) ──────────────────────────────────
section('39. Forensic snapshot builder (v2)');
const snap = buildForensicSnapshot({
  envelope: {
    envelopeId: 'env-snap-1', envelopeKind: 'observation',
    source: 'coingecko', providerId: 'prov-cg', sourceClass: 'MARKET_AGGREGATOR',
    ingestedTimestamp: NOW, routeMode: 'REALTIME',
    rawPayloadRef: 'raw://test', rawPayloadHash: 'abc123',
    normalizationVersion: '1.0.0', lineageComplete: true,
    timingCompleteness: 'full', idempotencyKey: 'ik-1', dedupFingerprint: 'fp-1',
  },
  freshnessState: 'F0_CURRENT',
  selectedConnector: 'cg-ws-01',
  identityVerdict: 'ACCEPT_NEW',
  blindSpots: ['ORDERING_GAP'],
  fieldGaps: ['missing_volume'],
});
assert(snap.snapshotId.startsWith('snap-'), 'Snapshot ID');
assert(snap.blindSpotRecord.routeBlindSpots.includes('ORDERING_GAP'), 'Blind spots in record');
assert(snap.blindSpotRecord.fieldGaps.includes('missing_volume'), 'Field gaps in record');
assert(snap.reconstructionIntegrity.integrityScore === 1, 'Full integrity');

// ═══════════════════════════════════════════════════════════════════════════════
// ANTI-FAKE SUITES
// ═══════════════════════════════════════════════════════════════════════════════

// ── 40. ANTI-FAKE: replay honesty — honest session ──────────────────────
section('40. ANTI-FAKE: replay honesty — honest session');
resetAll();
const rawH = archiveRawPayload(makeRawInput({ blob: { h: 1 } }));
registerInReplayIndex(makeIndexRecord({ envelopeId: 'env-h1', rawPayloadRef: rawH.rawPayloadRef }));
const honestSession = createReplaySession({
  scope: { envelopeIds: ['env-h1'] },
  replayMode: 'DRY_RUN_AUDIT',
  pinnedVersions: captureCurrentVersionPins(),
  replayGeneration: 1,
});
executeReplaySession(honestSession.sessionId);
const honestyCheck = verifyReplayHonesty(
  getAllReplaySessions().find(s => s.sessionId === honestSession.sessionId)!,
);
assert(honestyCheck.length === 0, 'Honest session passes');

// ── 41. ANTI-FAKE: replay honesty — COMPLETED with failures ────────────
section('41. ANTI-FAKE: replay honesty — COMPLETED with failures');
resetIngressReplayEngine();
const fakeS = createReplaySession({
  scope: { envelopeIds: ['env-h1'] },
  replayMode: 'DRY_RUN_AUDIT',
  pinnedVersions: captureCurrentVersionPins(),
  replayGeneration: 2,
});
const fakeExec = executeReplaySession(fakeS.sessionId);
fakeExec.results.failedReconstruction = 1;
fakeExec.status = 'COMPLETED';
const fakeCheck = verifyReplayHonesty(fakeExec);
assert(fakeCheck.length > 0, 'Detects COMPLETED+failures');
assert(fakeCheck.some(v => v.includes('COMPLETE_WITH_FAILURES')), 'Specific violation');

// ── 42. ANTI-FAKE: replay without version pins ─────────────────────────
section('42. ANTI-FAKE: replay without version pins');
resetIngressReplayEngine();
const unpinS = createReplaySession({
  scope: { envelopeIds: ['env-h1'] },
  replayMode: 'DRY_RUN_AUDIT',
  pinnedVersions: captureCurrentVersionPins(),
  replayGeneration: 3,
});
const unpinExec = executeReplaySession(unpinS.sessionId);
unpinExec.versionPins.envelopeProtocolVersion = '';
unpinExec.versionPins.normalizationVersion = '';
const unpinCheck = verifyReplayHonesty(unpinExec);
assert(unpinCheck.some(v => v.includes('WITHOUT_VERSION_PINS')), 'Missing pins detected');

// ── 43. ANTI-FAKE: strict forensic with divergence ─────────────────────
section('43. ANTI-FAKE: strict forensic with divergence');
resetIngressReplayEngine();
const strictS = createReplaySession({
  scope: { envelopeIds: ['env-h1'] },
  replayMode: 'STRICT_FORENSIC',
  pinnedVersions: captureCurrentVersionPins(),
  replayGeneration: 4,
});
const strictExec = executeReplaySession(strictS.sessionId);
strictExec.results.divergenceDetected = true;
strictExec.results.divergenceReasons.push('test divergence');
const strictCheck = verifyReplayHonesty(strictExec);
assert(strictCheck.some(v => v.includes('STRICT_FORENSIC_WITH_DIVERGENCE')), 'Strict+divergence detected');

// ── 44. ANTI-FAKE: forensic faithfulness — claim with raw ──────────────
section('44. ANTI-FAKE: forensic faithfulness — complete reconstruction');
resetAll();
const rawFF = archiveRawPayload(makeRawInput({ blob: { ff: 1 } }));
const recFF = makeIndexRecord({ envelopeId: 'env-ff-1', rawPayloadRef: rawFF.rawPayloadRef });
registerInReplayIndex(recFF);
storeNormalizedArtifact({ ...normArt, envelopeId: 'env-ff-1' });
registerDownstreamClaim({ claimId: 'jdg-ff-1', claimType: 'judgment', supportingEnvelopeIds: ['env-ff-1'] });
const reconFF = reconstruct({ targetType: 'judgment', targetId: 'jdg-ff-1' });
const ffCheck = verifyForensicFaithfulness(reconFF);
assert(ffCheck.length === 0, 'Complete reconstruction = faithful');

// ── 45. ANTI-FAKE: forensic faithfulness — missing raw ─────────────────
section('45. ANTI-FAKE: forensic faithfulness — missing raw');
const recNoRaw = makeIndexRecord({ envelopeId: 'env-ff-2', rawPayloadRef: 'raw://gone' });
registerInReplayIndex(recNoRaw);
registerDownstreamClaim({ claimId: 'jdg-ff-2', claimType: 'judgment', supportingEnvelopeIds: ['env-ff-2'] });
const reconNoRaw = reconstruct({ targetType: 'judgment', targetId: 'jdg-ff-2' });
const ffCheck2 = verifyForensicFaithfulness(reconNoRaw);
assert(ffCheck2.some(v => v.includes('RAW_PAYLOAD_NOT_RECOVERABLE')), 'Missing raw detected');

// ── 46. ANTI-FAKE: forensic faithfulness — blind spots in explanation ──
section('46. ANTI-FAKE: forensic faithfulness — blind spot disclosure');
const rawBS = archiveRawPayload(makeRawInput({ blob: { bs: 1 } }));
const recBS = makeIndexRecord({
  envelopeId: 'env-ff-3', rawPayloadRef: rawBS.rawPayloadRef,
  blindSpots: ['SEQUENCE_UNCERTAINTY'],
});
registerInReplayIndex(recBS);
const reconBS = reconstruct({ targetType: 'envelope', targetId: 'env-ff-3' });
const ffCheck3 = verifyForensicFaithfulness(reconBS);
assert(ffCheck3.length === 0, 'Blind spots disclosed in explanation = faithful');

// ── 47. ANTI-FAKE: backfill honesty ────────────────────────────────────
section('47. ANTI-FAKE: backfill honesty');
resetAll();
declareBackfillConstitution({ ...bc, backfillBatchId: 'bf-honest' });
const bfH = archiveRawPayload(makeRawInput({ blob: { bfh: 1 }, backfillBatchId: 'bf-honest' }));
registerInReplayIndex(makeIndexRecord({
  envelopeId: 'env-bfh-1', rawPayloadRef: bfH.rawPayloadRef,
  backfillBatchId: 'bf-honest', routeMode: 'BACKFILL', replayGeneration: 1,
}));
const bfHCheck = verifyBackfillHonesty('bf-honest');
assert(bfHCheck.length === 0, 'Honest backfill passes');

// ── 48. ANTI-FAKE: backfill without constitution ───────────────────────
section('48. ANTI-FAKE: backfill without constitution');
const bfNoConst = verifyBackfillHonesty('bf-nonexistent');
assert(bfNoConst.includes('BACKFILL_WITHOUT_CONSTITUTION'), 'No constitution detected');

// ── 49. ANTI-FAKE: backfill route mode mismatch ───────────────────────
section('49. ANTI-FAKE: backfill route mode mismatch');
resetAll();
declareBackfillConstitution({ ...bc, backfillBatchId: 'bf-route' });
const bfR = archiveRawPayload(makeRawInput({ blob: { bfr: 1 }, backfillBatchId: 'bf-route' }));
registerInReplayIndex(makeIndexRecord({
  envelopeId: 'env-bfr-1', rawPayloadRef: bfR.rawPayloadRef,
  backfillBatchId: 'bf-route', routeMode: 'REALTIME', replayGeneration: 1,
}));
const bfRCheck = verifyBackfillHonesty('bf-route');
assert(bfRCheck.some(v => v.includes('NON_BACKFILL_ROUTE')), 'Route mismatch detected');

// ── 50. ANTI-FAKE: backfill generation mismatch ───────────────────────
section('50. ANTI-FAKE: backfill generation mismatch');
resetAll();
declareBackfillConstitution({ ...bc, backfillBatchId: 'bf-gen' });
const bfG = archiveRawPayload(makeRawInput({ blob: { bfg: 1 }, backfillBatchId: 'bf-gen' }));
registerInReplayIndex(makeIndexRecord({
  envelopeId: 'env-bfg-1', rawPayloadRef: bfG.rawPayloadRef,
  backfillBatchId: 'bf-gen', routeMode: 'BACKFILL', replayGeneration: 99,
}));
const bfGCheck = verifyBackfillHonesty('bf-gen');
assert(bfGCheck.some(v => v.includes('REPLAY_GENERATION_MISMATCH')), 'Generation mismatch detected');

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
