/**
 * L2.1 Constitutional Envelope Protocol — Comprehensive Test Suite
 *
 * Tests: schema, timing, ambiguity, fallback, replay, lineage, anti-fake
 */

import {
  buildConstitutionalEnvelope,
  type ConstitutionalBuilderInput,
} from '../services/connector-layer/constitutional-builder';
import {
  validateConstitutionalEnvelope,
  type ConstitutionalValidationResult,
} from '../services/connector-layer/constitutional-validator';
import type { ConstitutionalEnvelope, NormalizedFieldLineage } from '../services/connector-layer/constitutional-envelope';
import { L21_PROTOCOL_VERSION } from '../services/connector-layer/constitutional-envelope';
import {
  processEnvelopeIngress,
  isDuplicate,
  isCorrection,
  getCorrectionChain,
  getReplayLedger,
  getAllBackfillBatches,
  buildLineageAudit,
  verifyLineageIntegrity,
  resetAllLineageState,
} from '../services/connector-layer/envelope-lineage';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HARNESS
// ═══════════════════════════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}

function section(title: string) {
  console.log(`\n🔷 ${title}`);
}

function makeInput(overrides?: Partial<ConstitutionalBuilderInput>): ConstitutionalBuilderInput {
  return {
    source: 'coingecko',
    providerId: 'coingecko_v3',
    sourceClass: 'market_data',
    entityType: 'asset',
    entityScope: 'exact_asset',
    canonicalCandidateIds: ['asset:btc'],
    connectorName: 'coingecko-connector',
    connectorVersion: '2.1.0',
    rawPayload: { price: 68000, market_cap: 1340000000000 },
    normalizedPayload: { spotPrice: 68000, marketCap: 1340000000000 },
    observedAt: Date.now() - 2000,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. SCHEMA TESTS
// ═══════════════════════════════════════════════════════════════════════════════

section('1. Schema completeness');
{
  const env = buildConstitutionalEnvelope(makeInput());

  assert(env.protocolVersion === L21_PROTOCOL_VERSION, 'protocolVersion matches L2.1');
  assert(env.envelopeKind === 'observation', 'Default kind is observation');

  assert(!!env.identity, 'identity block present');
  assert(!!env.identity.envelopeId, 'envelopeId generated');
  assert(!!env.identity.traceId, 'traceId generated');
  assert(!!env.identity.routeId, 'routeId generated');
  assert(!!env.identity.connectorInstanceId, 'connectorInstanceId generated');
  assert(env.identity.source === 'coingecko', 'source carried');
  assert(env.identity.providerId === 'coingecko_v3', 'providerId carried');
  assert(env.identity.sourceClass === 'market_data', 'sourceClass carried');

  assert(!!env.sourceContext, 'sourceContext block present');
  assert(env.sourceContext.entityType === 'asset', 'entityType carried');
  assert(env.sourceContext.entityScope === 'exact_asset', 'entityScope carried');

  assert(!!env.canonicalContext, 'canonicalContext block present');
  assert(Array.isArray(env.canonicalContext.canonicalCandidateIds), 'canonicalCandidateIds is array');
  assert(env.canonicalContext.canonicalCandidateIds[0] === 'asset:btc', 'candidate id carried');
  assert(env.canonicalContext.canonicalResolutionState === 'resolved', 'Single candidate resolves');
  assert(typeof env.canonicalContext.canonicalResolutionConfidence === 'number', 'confidence is number');

  assert(!!env.timing, 'timing block present');
  assert(!!env.timing.receivedTimestamp, 'receivedTimestamp present');
  assert(!!env.timing.ingestedTimestamp, 'ingestedTimestamp present');
  assert(!!env.timing.observedTimestamp, 'observedTimestamp present from input');

  assert(!!env.routeContext, 'routeContext block present');
  assert(env.routeContext.routeMode === 'scheduled', 'Default routeMode scheduled');
  assert(env.routeContext.fallbackStatus === 'none', 'Default fallbackStatus none');
  assert(Array.isArray(env.routeContext.blindSpotFlags), 'blindSpotFlags is array');

  assert(!!env.authorityContext, 'authorityContext block present');
  assert(!!env.payloadContext, 'payloadContext block present');
  assert(!!env.payloadContext.rawPayloadRef, 'rawPayloadRef generated');
  assert(!!env.payloadContext.rawPayloadHash, 'rawPayloadHash generated');
  assert(env.payloadContext.rawPayloadHash.length === 32, 'Hash is 32 chars');
  assert(!!env.payloadContext.normalizationVersion, 'normalizationVersion present');

  assert(!!env.replayContext, 'replayContext block present');
  assert(!!env.replayContext.idempotencyKey, 'idempotencyKey generated');
  assert(!!env.replayContext.dedupFingerprint, 'dedupFingerprint generated');
  assert(env.replayContext.replayGeneration === 0, 'Default generation 0');

  assert(!!env.validationContext, 'validationContext block present');
  assert(typeof env.validationContext.schemaValid === 'boolean', 'schemaValid is boolean');
  assert(typeof env.validationContext.envelopeValid === 'boolean', 'envelopeValid is boolean');

  assert(!!env.lineageContext, 'lineageContext block present');
  assert(env.lineageContext.upstreamConnectorName === 'coingecko-connector', 'connectorName carried');
  assert(env.lineageContext.upstreamConnectorVersion === '2.1.0', 'connectorVersion carried');
  assert(Array.isArray(env.lineageContext.lineagePath), 'lineagePath is array');
  assert(env.lineageContext.lineagePath.length > 0, 'lineagePath not empty');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. VALIDATION — HARD FAIL CONDITIONS
// ═══════════════════════════════════════════════════════════════════════════════

section('2. Validation: hard-fail conditions');
{
  const env = buildConstitutionalEnvelope(makeInput());
  const res = validateConstitutionalEnvelope(env);
  assert(res.valid, 'Valid envelope passes validation');
  assert(res.hardFails === 0, 'Zero hard fails');

  // Missing envelopeId
  const broken = JSON.parse(JSON.stringify(env)) as ConstitutionalEnvelope;
  broken.identity.envelopeId = '';
  const r2 = validateConstitutionalEnvelope(broken);
  assert(!r2.valid, 'Empty envelopeId causes hard fail');

  // Missing traceId
  const broken2 = JSON.parse(JSON.stringify(env)) as ConstitutionalEnvelope;
  broken2.identity.traceId = '';
  assert(!validateConstitutionalEnvelope(broken2).valid, 'Empty traceId causes hard fail');

  // Missing rawPayloadRef
  const broken3 = JSON.parse(JSON.stringify(env)) as ConstitutionalEnvelope;
  broken3.payloadContext.rawPayloadRef = '';
  assert(!validateConstitutionalEnvelope(broken3).valid, 'Empty rawPayloadRef causes hard fail');

  // Missing rawPayloadHash
  const broken4 = JSON.parse(JSON.stringify(env)) as ConstitutionalEnvelope;
  broken4.payloadContext.rawPayloadHash = '';
  assert(!validateConstitutionalEnvelope(broken4).valid, 'Empty rawPayloadHash causes hard fail');

  // Missing normalizationVersion
  const broken5 = JSON.parse(JSON.stringify(env)) as ConstitutionalEnvelope;
  broken5.payloadContext.normalizationVersion = '';
  assert(!validateConstitutionalEnvelope(broken5).valid, 'Empty normalizationVersion causes hard fail');

  // Invalid entityType
  const broken6 = JSON.parse(JSON.stringify(env)) as ConstitutionalEnvelope;
  (broken6 as any).sourceContext.entityType = 'bogus';
  assert(!validateConstitutionalEnvelope(broken6).valid, 'Invalid entityType causes hard fail');

  // Invalid envelopeKind
  const broken7 = JSON.parse(JSON.stringify(env)) as ConstitutionalEnvelope;
  (broken7 as any).envelopeKind = 'invalid_kind';
  assert(!validateConstitutionalEnvelope(broken7).valid, 'Invalid envelopeKind causes hard fail');

  // Negative replayGeneration
  const broken8 = JSON.parse(JSON.stringify(env)) as ConstitutionalEnvelope;
  broken8.replayContext.replayGeneration = -1;
  assert(!validateConstitutionalEnvelope(broken8).valid, 'Negative replayGeneration causes hard fail');

  // Correction self-reference
  const broken9 = JSON.parse(JSON.stringify(env)) as ConstitutionalEnvelope;
  broken9.replayContext.correctionOfEnvelopeId = broken9.identity.envelopeId;
  assert(!validateConstitutionalEnvelope(broken9).valid, 'Correction self-reference causes hard fail');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. TIMING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

section('3. Timing invariants');
{
  const env = buildConstitutionalEnvelope(makeInput());
  const res = validateConstitutionalEnvelope(env);
  assert(!res.violations.some(v => v.code.startsWith('TIME-INV')), 'Valid timing: no timing invariant violations');

  // receivedTimestamp > ingestedTimestamp (impossible)
  const bad = JSON.parse(JSON.stringify(env)) as ConstitutionalEnvelope;
  bad.timing.receivedTimestamp = '2099-01-01T00:00:00.000Z';
  bad.timing.ingestedTimestamp = '2020-01-01T00:00:00.000Z';
  const r2 = validateConstitutionalEnvelope(bad);
  assert(r2.violations.some(v => v.code === 'TIME-INV-1'), 'received > ingested triggers TIME-INV-1');

  // observedTimestamp > publishedTimestamp
  const bad2 = JSON.parse(JSON.stringify(env)) as ConstitutionalEnvelope;
  bad2.timing.observedTimestamp = '2099-01-01T00:00:00.000Z';
  bad2.timing.publishedTimestamp = '2020-01-01T00:00:00.000Z';
  const r3 = validateConstitutionalEnvelope(bad2);
  assert(r3.violations.some(v => v.code === 'TIME-INV-2'), 'observed > published triggers TIME-INV-2');

  // Partial timing completeness
  const partial = buildConstitutionalEnvelope(makeInput({ observedAt: undefined, publishedAt: undefined }));
  assert(partial.timing.timingCompleteness === 'minimal', 'No observed/published = minimal completeness');

  const withObs = buildConstitutionalEnvelope(makeInput({ publishedAt: undefined }));
  assert(withObs.timing.timingCompleteness === 'partial', 'Observed but no published = partial');

  const full = buildConstitutionalEnvelope(makeInput({ observedAt: Date.now() - 3000, publishedAt: Date.now() - 1000 }));
  assert(full.timing.timingCompleteness === 'full', 'Both observed and published = full');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. AMBIGUITY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

section('4. Canonical ambiguity preservation');
{
  const single = buildConstitutionalEnvelope(makeInput({ canonicalCandidateIds: ['asset:btc'] }));
  assert(single.canonicalContext.canonicalResolutionState === 'resolved', 'Single candidate → resolved');

  const multi = buildConstitutionalEnvelope(makeInput({ canonicalCandidateIds: ['asset:btc', 'asset:wbtc'] }));
  assert(multi.canonicalContext.canonicalResolutionState === 'ambiguous', 'Multiple candidates → ambiguous');
  assert(multi.canonicalContext.canonicalCandidateIds.length === 2, 'Both candidates preserved');

  const none = buildConstitutionalEnvelope(makeInput({ canonicalCandidateIds: [] }));
  assert(none.canonicalContext.canonicalResolutionState === 'unresolved', 'Zero candidates → unresolved');
  assert(none.canonicalContext.canonicalCandidateIds.length === 0, 'Empty array preserved');

  // Validation: resolved but no candidates
  const badResolved = JSON.parse(JSON.stringify(single)) as ConstitutionalEnvelope;
  badResolved.canonicalContext.canonicalResolutionState = 'resolved';
  badResolved.canonicalContext.canonicalCandidateIds = [];
  const vr = validateConstitutionalEnvelope(badResolved);
  assert(vr.violations.some(v => v.code === 'CAN-4'), 'Resolved with zero candidates triggers CAN-4');

  // Validation: resolved with multiple (soft degraded)
  const multiResolved = JSON.parse(JSON.stringify(multi)) as ConstitutionalEnvelope;
  multiResolved.canonicalContext.canonicalResolutionState = 'resolved';
  const vr2 = validateConstitutionalEnvelope(multiResolved);
  assert(vr2.violations.some(v => v.code === 'CAN-5'), 'Resolved with multiple candidates triggers CAN-5');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. FALLBACK TESTS
// ═══════════════════════════════════════════════════════════════════════════════

section('5. Fallback honesty');
{
  const primary = buildConstitutionalEnvelope(makeInput({ fallbackStatus: 'none' }));
  assert(primary.routeContext.fallbackStatus === 'none', 'Primary: fallback none');
  assert(validateConstitutionalEnvelope(primary).valid, 'Primary passes validation');

  const fb = buildConstitutionalEnvelope(makeInput({ fallbackStatus: 'used', fallbackReason: 'primary_timeout' }));
  assert(fb.routeContext.fallbackStatus === 'used', 'Fallback used carried');
  assert(fb.routeContext.fallbackReason === 'primary_timeout', 'Fallback reason carried');
  assert(validateConstitutionalEnvelope(fb).valid, 'Fallback with reason passes');

  // Fallback used without reason → hard fail
  const noReason = JSON.parse(JSON.stringify(fb)) as ConstitutionalEnvelope;
  noReason.routeContext.fallbackReason = undefined;
  const vr = validateConstitutionalEnvelope(noReason);
  assert(vr.violations.some(v => v.code === 'ROUTE-5'), 'Fallback used without reason triggers ROUTE-5');

  // Blind spot flags
  const blind = buildConstitutionalEnvelope(makeInput({ blindSpotFlags: ['owner_unavailable', 'semantic_loss'] }));
  assert(blind.routeContext.blindSpotFlags.length === 2, 'Blind spot flags carried');
  assert(blind.routeContext.blindSpotFlags.includes('owner_unavailable'), 'Owner unavailable flag preserved');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. REPLAY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

section('6. Replay safety');
{
  resetAllLineageState();

  const env1 = buildConstitutionalEnvelope(makeInput());
  const r1 = processEnvelopeIngress(env1);
  assert(r1.accepted, 'First ingress accepted');
  assert(!r1.duplicate, 'First ingress not duplicate');

  // Same envelope again → duplicate
  const r2 = processEnvelopeIngress(env1);
  assert(!r2.accepted, 'Same envelope rejected as duplicate');
  assert(r2.duplicate, 'Duplicate flag set');

  // New envelope (different source) accepted
  const env2 = buildConstitutionalEnvelope(makeInput({ source: 'coinglass', providerId: 'coinglass_v4' }));
  const r3 = processEnvelopeIngress(env2);
  assert(r3.accepted, 'Different source accepted');

  // Replay generation
  const env3 = buildConstitutionalEnvelope(makeInput({ replayGeneration: 1 }));
  assert(env3.replayContext.replayGeneration === 1, 'Generation 1 carried');

  // Backfill — different observation time to avoid dedup collision with env1
  const bfEnv = buildConstitutionalEnvelope(makeInput({
    kind: 'backfill_record',
    backfillBatchId: 'batch-2024-01',
    observedAt: Date.now() - 86400000,
    canonicalCandidateIds: ['asset:btc-backfill'],
  }));
  const bfResult = processEnvelopeIngress(bfEnv);
  assert(bfResult.accepted, 'Backfill envelope accepted');
  assert(bfResult.backfill, 'Backfill flag set');
  const batches = getAllBackfillBatches();
  assert(batches.some(b => b.batchId === 'batch-2024-01'), 'Backfill batch registered');

  // Correction
  const corrEnv = buildConstitutionalEnvelope(makeInput({
    kind: 'correction',
    correctionOfEnvelopeId: env1.identity.envelopeId,
  }));
  const corrResult = processEnvelopeIngress(corrEnv);
  assert(corrResult.accepted, 'Correction envelope accepted');
  assert(corrResult.correction, 'Correction flag set');
  assert(isCorrection(corrEnv), 'isCorrection returns true');
  const chain = getCorrectionChain(env1.identity.envelopeId);
  assert(chain.includes(corrEnv.identity.envelopeId), 'Correction chain tracked');

  // Replay ledger
  const ledger = getReplayLedger();
  assert(ledger.length >= 4, 'Replay ledger has entries');
  assert(ledger.some(e => e.isDuplicate), 'Duplicate logged in ledger');
  assert(ledger.some(e => e.isCorrection), 'Correction logged in ledger');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. LINEAGE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

section('7. Lineage integrity');
{
  const env = buildConstitutionalEnvelope(makeInput());

  const audit = buildLineageAudit(env);
  assert(!!audit.rawPayloadRef, 'Audit has rawPayloadRef');
  assert(!!audit.rawPayloadHash, 'Audit has rawPayloadHash');
  assert(!!audit.normalizationVersion, 'Audit has normalizationVersion');
  assert(!!audit.connectorName, 'Audit has connectorName');
  assert(audit.lineagePath.length > 0, 'Audit has lineagePath');

  const integrity = verifyLineageIntegrity(env);
  assert(integrity.intact, 'Lineage integrity intact for valid envelope');
  assert(integrity.issues.length === 0, 'No lineage issues');

  // Break lineage
  const broken = JSON.parse(JSON.stringify(env)) as ConstitutionalEnvelope;
  broken.payloadContext.rawPayloadRef = '';
  const brokenInteg = verifyLineageIntegrity(broken);
  assert(!brokenInteg.intact, 'Broken rawPayloadRef detected');
  assert(brokenInteg.issues.some(i => i.includes('rawPayloadRef')), 'Missing rawPayloadRef issue reported');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. ANTI-FAKE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

section('8. Anti-fake: normalized fragment without lineage');
{
  const env = buildConstitutionalEnvelope(makeInput());
  const valid = validateConstitutionalEnvelope(env);
  assert(!valid.violations.some(v => v.code.startsWith('ANTIFAKE')), 'Valid envelope has no anti-fake violations');

  // Normalized fragment without raw ref
  const broken = JSON.parse(JSON.stringify(env)) as ConstitutionalEnvelope;
  broken.payloadContext.rawPayloadRef = '';
  const r = validateConstitutionalEnvelope(broken);
  assert(r.violations.some(v => v.code === 'ANTIFAKE-1'), 'Fragment without raw lineage triggers ANTIFAKE-1');

  // Normalized fragment without normalization version
  const broken2 = JSON.parse(JSON.stringify(env)) as ConstitutionalEnvelope;
  broken2.payloadContext.normalizationVersion = '';
  const r2 = validateConstitutionalEnvelope(broken2);
  assert(r2.violations.some(v => v.code === 'ANTIFAKE-2'), 'Fragment without version triggers ANTIFAKE-2');

  // Normalized fragment without timing
  const broken3 = JSON.parse(JSON.stringify(env)) as ConstitutionalEnvelope;
  broken3.timing.receivedTimestamp = '';
  broken3.timing.ingestedTimestamp = '';
  const r3 = validateConstitutionalEnvelope(broken3);
  assert(r3.violations.some(v => v.code === 'ANTIFAKE-3'), 'Fragment without timing triggers ANTIFAKE-3');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9. ENVELOPE KIND VARIATIONS
// ═══════════════════════════════════════════════════════════════════════════════

section('9. Envelope kind variations');
{
  const kinds: Array<ConstitutionalEnvelope['envelopeKind']> = ['observation', 'correction', 'snapshot', 'event', 'backfill_record'];
  for (const kind of kinds) {
    const env = buildConstitutionalEnvelope(makeInput({ kind }));
    assert(env.envelopeKind === kind, `Kind ${kind} carried`);
    assert(validateConstitutionalEnvelope(env).valid, `Kind ${kind} passes validation`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. ROUTE MODE VARIATIONS
// ═══════════════════════════════════════════════════════════════════════════════

section('10. Route mode variations');
{
  const modes: Array<ConstitutionalEnvelope['routeContext']['routeMode']> = ['realtime', 'scheduled', 'on_demand', 'backfill'];
  for (const mode of modes) {
    const env = buildConstitutionalEnvelope(makeInput({ routeMode: mode }));
    assert(env.routeContext.routeMode === mode, `Mode ${mode} carried`);
    assert(validateConstitutionalEnvelope(env).valid, `Mode ${mode} passes validation`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11. AUTHORITY CONTEXT
// ═══════════════════════════════════════════════════════════════════════════════

section('11. Authority context carry-forward');
{
  const env = buildConstitutionalEnvelope(makeInput({
    authorityRole: 'owner',
    trustClass: 'verified',
    substitutionRight: 'full',
    speakabilityPrecheck: 'pass',
    healthSnapshotRef: 'health-snap-001',
  }));
  assert(env.authorityContext.authorityRole === 'owner', 'Authority role carried');
  assert(env.authorityContext.trustClass === 'verified', 'Trust class carried');
  assert(env.authorityContext.substitutionRight === 'full', 'Substitution right carried');
  assert(env.authorityContext.speakabilityPrecheck === 'pass', 'Speakability precheck carried');
  assert(env.authorityContext.healthSnapshotRef === 'health-snap-001', 'Health snapshot ref carried');
  assert(validateConstitutionalEnvelope(env).valid, 'Full authority context passes');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 12. DOCTRINAL INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

section('12. Doctrinal invariants');
{
  // Rule A: An observation is not evidence until it is enveloped
  assert(L21_PROTOCOL_VERSION === '1.1.0', 'Protocol version is 1.1.0 (evidence-grade)');

  // Rule B: Ambiguity is first-class
  const ambig = buildConstitutionalEnvelope(makeInput({ canonicalCandidateIds: ['a:1', 'a:2', 'a:3'] }));
  assert(ambig.canonicalContext.canonicalCandidateIds.length === 3, 'Three candidates preserved');
  assert(ambig.canonicalContext.canonicalResolutionState === 'ambiguous', 'Ambiguous state set');

  // Rule C: Timing is multi-dimensional
  const env = buildConstitutionalEnvelope(makeInput({ observedAt: Date.now() - 5000, publishedAt: Date.now() - 2000 }));
  assert(!!env.timing.observedTimestamp, 'Observed time present');
  assert(!!env.timing.publishedTimestamp, 'Published time present');
  assert(!!env.timing.receivedTimestamp, 'Received time present');
  assert(!!env.timing.ingestedTimestamp, 'Ingested time present');

  // Rule D: Normalized payload without raw lineage is not auditable
  const lineage = verifyLineageIntegrity(env);
  assert(lineage.intact, 'Valid envelope has intact lineage');

  // Rule E: Envelope is constitutional claim
  const allBlocks = [
    'identity', 'sourceContext', 'canonicalContext', 'timing',
    'routeContext', 'authorityContext', 'payloadContext', 'replayContext',
    'validationContext', 'lineageContext',
  ];
  for (const block of allBlocks) {
    assert((env as any)[block] !== undefined, `Block ${block} present`);
  }

  // No fallback use is silent (Invariant 4)
  const fbEnv = buildConstitutionalEnvelope(makeInput({ fallbackStatus: 'used', fallbackReason: 'timeout' }));
  assert(fbEnv.routeContext.fallbackReason === 'timeout', 'Fallback reason explicitly carried');

  // Replay metadata survives re-ingestion (Invariant 6)
  const replayEnv = buildConstitutionalEnvelope(makeInput({ replayGeneration: 2, backfillBatchId: 'bf-test' }));
  assert(replayEnv.replayContext.replayGeneration === 2, 'Replay generation survives');
  assert(replayEnv.replayContext.backfillBatchId === 'bf-test', 'Backfill batch survives');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 13. L2.1.1 — OBSERVATION SEMANTICS
// ═══════════════════════════════════════════════════════════════════════════════

section('13. Observation semantics');
{
  const env = buildConstitutionalEnvelope(makeInput());
  assert(!!env.observationSemantics, 'observationSemantics block present');
  assert(env.observationSemantics.observationKind === 'POINT_IN_TIME_SNAPSHOT', 'Default observation is snapshot');
  assert(env.observationSemantics.samplingBasis === 'PROVIDER_DEFINED', 'Default sampling is provider-defined');

  const event = buildConstitutionalEnvelope(makeInput({ kind: 'event' }));
  assert(event.observationSemantics.observationKind === 'RAW_EVENT', 'Event kind maps to RAW_EVENT');

  const correction = buildConstitutionalEnvelope(makeInput({ kind: 'correction', correctionOfEnvelopeId: 'env-other' }));
  assert(correction.observationSemantics.observationKind === 'CORRECTION', 'Correction kind maps to CORRECTION');

  const backfill = buildConstitutionalEnvelope(makeInput({ kind: 'backfill_record', observedAt: Date.now() - 86400000, canonicalCandidateIds: ['asset:btc-bf'] }));
  assert(backfill.observationSemantics.observationKind === 'BACKFILL_RECONSTRUCTION', 'Backfill maps correctly');

  const rolling = buildConstitutionalEnvelope(makeInput({
    observationKind: 'ROLLING_AGGREGATE',
    aggregationWindowMs: 3600000,
    samplingBasis: 'FIXED_INTERVAL',
    metricFamily: 'funding_rate',
    methodologyId: 'coinglass-v4-funding',
  }));
  assert(rolling.observationSemantics.observationKind === 'ROLLING_AGGREGATE', 'Rolling aggregate carried');
  assert(rolling.observationSemantics.aggregationWindowMs === 3600000, 'Window carried');
  assert(rolling.observationSemantics.samplingBasis === 'FIXED_INTERVAL', 'Sampling carried');
  assert(rolling.observationSemantics.metricFamily === 'funding_rate', 'Metric family carried');
  assert(rolling.observationSemantics.methodologyId === 'coinglass-v4-funding', 'Methodology carried');

  // Validator catches rolling without window
  const badRolling = JSON.parse(JSON.stringify(rolling)) as ConstitutionalEnvelope;
  badRolling.observationSemantics.aggregationWindowMs = undefined;
  const vr = validateConstitutionalEnvelope(badRolling);
  assert(vr.violations.some(v => v.code === 'OBS-3'), 'Rolling aggregate without window triggers OBS-3');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 14. L2.1.1 — FIELD LINEAGE & NORMALIZATION OUTCOME
// ═══════════════════════════════════════════════════════════════════════════════

section('14. Field lineage & normalization outcome');
{
  const env = buildConstitutionalEnvelope(makeInput({
    normalizedFieldIds: ['price.spot', 'market_cap'],
    suppressedFieldIds: ['volume_24h'],
    failedFieldIds: [],
    fieldLineage: [
      { fragmentId: 'frag-1', fieldId: 'price.spot', sourcePointer: '$.market_data.current_price.usd', normalizationRuleId: 'coingecko-price-v1', validationResult: 'PASS' },
      { fragmentId: 'frag-2', fieldId: 'market_cap', sourcePointer: '$.market_data.market_cap.usd', normalizationRuleId: 'coingecko-mcap-v1', validationResult: 'PASS' },
    ],
  }));

  assert(!!env.normalizationOutcome, 'normalizationOutcome present');
  assert(env.normalizationOutcome.normalizedFieldIds.length === 2, 'Two fields normalized');
  assert(env.normalizationOutcome.suppressedFieldIds.length === 1, 'One field suppressed');
  assert(env.normalizationOutcome.fieldCompletenessRatio < 1, 'Completeness below 1 when suppressed');

  assert(!!env.fieldLineage, 'fieldLineage present');
  assert(env.fieldLineage.normalizedFieldLineage.length === 2, 'Two lineage entries');
  assert(env.fieldLineage.normalizedFieldLineage[0].sourcePointer === '$.market_data.current_price.usd', 'JSONPath preserved');
  assert(env.fieldLineage.normalizedFieldLineage[0].validationResult === 'PASS', 'Validation result carried');

  // Full completeness when nothing fails
  const full = buildConstitutionalEnvelope(makeInput({ normalizedFieldIds: ['a', 'b', 'c'] }));
  assert(full.normalizationOutcome.fieldCompletenessRatio === 1, 'Full completeness when no failures');

  // Disposition reflects warnings from suppressed fields
  assert(env.disposition.disposition === 'ACCEPTED_WITH_WARNINGS', 'Suppressed fields cause warnings disposition');
  const clean = buildConstitutionalEnvelope(makeInput());
  assert(clean.disposition.disposition === 'ACCEPTED', 'Clean envelope is ACCEPTED');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 15. L2.1.2 — TEMPORAL UNCERTAINTY
// ═══════════════════════════════════════════════════════════════════════════════

section('15. Temporal uncertainty');
{
  const env = buildConstitutionalEnvelope(makeInput({
    sourceClockConfidence: 'HIGH',
    observedTimestampPrecision: 'MS',
    estimatedClockSkewMs: 50,
    temporalUncertaintyMs: 200,
  }));
  assert(!!env.temporalUncertainty, 'temporalUncertainty block present');
  assert(env.temporalUncertainty.sourceClockConfidence === 'HIGH', 'Clock confidence carried');
  assert(env.temporalUncertainty.observedTimestampPrecision === 'MS', 'Precision carried');
  assert(env.temporalUncertainty.estimatedClockSkewMs === 50, 'Skew carried');
  assert(env.temporalUncertainty.temporalUncertaintyMs === 200, 'Uncertainty carried');

  const unknown = buildConstitutionalEnvelope(makeInput());
  assert(unknown.temporalUncertainty.sourceClockConfidence === 'UNKNOWN', 'Default clock confidence is UNKNOWN');

  // Invalid clock confidence
  const bad = JSON.parse(JSON.stringify(env)) as ConstitutionalEnvelope;
  (bad as any).temporalUncertainty.sourceClockConfidence = 'BOGUS';
  assert(validateConstitutionalEnvelope(bad).violations.some(v => v.code === 'TEMP-1'), 'Invalid clock confidence triggers TEMP-1');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 16. L2.1.2 — ATTESTATION & POLICY PINS
// ═══════════════════════════════════════════════════════════════════════════════

section('16. Attestation & policy pins');
{
  const env = buildConstitutionalEnvelope(makeInput());

  assert(!!env.attestation, 'attestation block present');
  assert(!!env.attestation.canonicalEnvelopeHash, 'Envelope hash generated');
  assert(env.attestation.canonicalEnvelopeHash.length === 32, 'Hash is 32 chars');
  assert(!!env.attestation.rawPayloadContentAddress, 'Content address present');
  assert(env.attestation.builderVersion === L21_PROTOCOL_VERSION, 'Builder version matches protocol');
  assert(!!env.attestation.connectorConfigHash, 'Config hash generated');

  assert(!!env.policyPins, 'policyPins block present');
  assert(env.policyPins.envelopeSchemaVersion === L21_PROTOCOL_VERSION, 'Schema version matches protocol');
  assert(!!env.policyPins.authorityConstitutionVersion, 'Authority policy pinned');
  assert(!!env.policyPins.freshnessPolicyVersion, 'Freshness policy pinned');

  // Two envelopes from different payloads have different hashes
  const env2 = buildConstitutionalEnvelope(makeInput({ rawPayload: { different: true } }));
  assert(env.attestation.canonicalEnvelopeHash !== env2.attestation.canonicalEnvelopeHash, 'Different payloads produce different hashes');

  // Missing attestation fields cause hard fail
  const broken = JSON.parse(JSON.stringify(env)) as ConstitutionalEnvelope;
  broken.attestation.canonicalEnvelopeHash = '';
  assert(!validateConstitutionalEnvelope(broken).valid, 'Empty envelope hash causes hard fail');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 17. L2.1.3 — INGRESS USAGE RIGHTS
// ═══════════════════════════════════════════════════════════════════════════════

section('17. Ingress usage rights');
{
  const live = buildConstitutionalEnvelope(makeInput());
  assert(!!live.usageRights, 'usageRights block present');
  assert(live.usageRights.permittedUses.includes('LIVE_SCORING'), 'Live envelope permits scoring');
  assert(live.usageRights.permittedUses.includes('CANONICALIZATION'), 'Live envelope permits canonicalization');
  assert(live.usageRights.prohibitedUses.length === 0, 'Live envelope has no prohibitions');

  const bf = buildConstitutionalEnvelope(makeInput({ kind: 'backfill_record', observedAt: Date.now() - 86400000, canonicalCandidateIds: ['asset:btc-bf2'] }));
  assert(bf.usageRights.permittedUses.includes('REPLAY_ONLY'), 'Backfill permits replay only');
  assert(bf.usageRights.prohibitedUses.includes('LIVE_SCORING'), 'Backfill prohibits live scoring');
  assert(bf.usageRights.prohibitedUses.includes('DIRECTIONAL_CLAIMS'), 'Backfill prohibits directional claims');

  const stale = buildConstitutionalEnvelope(makeInput({ observedAt: Date.now() - 700000 }));
  assert(stale.usageRights.permittedUses.includes('DISPLAY'), 'Stale permits display');
  assert(!stale.usageRights.permittedUses.includes('LIVE_SCORING'), 'Stale does not permit live scoring');

  // Contradictory rights cause hard fail
  const broken = JSON.parse(JSON.stringify(live)) as ConstitutionalEnvelope;
  broken.usageRights.permittedUses = ['LIVE_SCORING'];
  broken.usageRights.prohibitedUses = ['LIVE_SCORING'];
  const vr = validateConstitutionalEnvelope(broken);
  assert(vr.violations.some(v => v.code === 'USAGE-4'), 'Contradictory rights trigger USAGE-4');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 18. L2.1.3 — DISPOSITION
// ═══════════════════════════════════════════════════════════════════════════════

section('18. Disposition');
{
  const clean = buildConstitutionalEnvelope(makeInput());
  assert(clean.disposition.disposition === 'ACCEPTED', 'Clean envelope is ACCEPTED');

  const warned = buildConstitutionalEnvelope(makeInput({ suppressedFieldIds: ['field_x'] }));
  assert(warned.disposition.disposition === 'ACCEPTED_WITH_WARNINGS', 'Suppressed field causes warnings');
  assert(warned.disposition.dispositionReasonCodes.some(r => r.includes('suppressed')), 'Reason code mentions suppression');

  // Invalid disposition
  const bad = JSON.parse(JSON.stringify(clean)) as ConstitutionalEnvelope;
  (bad as any).disposition.disposition = 'INVALID';
  assert(validateConstitutionalEnvelope(bad).violations.some(v => v.code === 'DISP-1'), 'Invalid disposition triggers DISP-1');

  // Quarantined without bucket
  const quarantined = JSON.parse(JSON.stringify(clean)) as ConstitutionalEnvelope;
  quarantined.disposition.disposition = 'QUARANTINED';
  const qr = validateConstitutionalEnvelope(quarantined);
  assert(qr.violations.some(v => v.code === 'DISP-2'), 'Quarantined without bucket triggers DISP-2');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 19. L2.1.3 — SUPERSESSION
// ═══════════════════════════════════════════════════════════════════════════════

section('19. Supersession');
{
  const env = buildConstitutionalEnvelope(makeInput({
    correctionOfEnvelopeId: 'env-original-123',
    correctionType: 'VALUE_CORRECTION',
    correctionReasonCode: 'price_recalculated',
    revisionNumber: 1,
    supersessionChainRootId: 'env-root-000',
  }));
  assert(!!env.supersession, 'supersession block present');
  assert(env.supersession.revisionNumber === 1, 'Revision number carried');
  assert(env.supersession.supersedesEnvelopeId === 'env-original-123', 'Supersedes id carried');
  assert(env.supersession.correctionType === 'VALUE_CORRECTION', 'Correction type carried');
  assert(env.supersession.correctionReasonCode === 'price_recalculated', 'Reason code carried');
  assert(env.supersession.supersessionChainRootId === 'env-root-000', 'Chain root carried');

  // Self-supersession
  const broken = JSON.parse(JSON.stringify(env)) as ConstitutionalEnvelope;
  broken.supersession.supersedesEnvelopeId = broken.identity.envelopeId;
  assert(validateConstitutionalEnvelope(broken).violations.some(v => v.code === 'SUPER-3'), 'Self-supersession triggers SUPER-3');

  // Invalid correction type
  const bad = JSON.parse(JSON.stringify(env)) as ConstitutionalEnvelope;
  (bad as any).supersession.correctionType = 'FAKE';
  assert(validateConstitutionalEnvelope(bad).violations.some(v => v.code === 'SUPER-2'), 'Invalid correction type triggers SUPER-2');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 20. L2.1.3 — ORDERING
// ═══════════════════════════════════════════════════════════════════════════════

section('20. Ordering');
{
  const env = buildConstitutionalEnvelope(makeInput({
    orderingDomain: 'derivatives:coinglass',
    monotonicSequenceId: 'seq-001',
    causalParentEnvelopeIds: ['env-parent-1'],
    siblingEnvelopeIds: ['env-sibling-1', 'env-sibling-2'],
  }));
  assert(!!env.ordering, 'ordering block present');
  assert(env.ordering.orderingDomain === 'derivatives:coinglass', 'Domain carried');
  assert(env.ordering.monotonicSequenceId === 'seq-001', 'Sequence id carried');
  assert(env.ordering.causalParentEnvelopeIds.length === 1, 'Causal parent carried');
  assert(env.ordering.siblingEnvelopeIds.length === 2, 'Siblings carried');

  // Default ordering domain
  const def = buildConstitutionalEnvelope(makeInput());
  assert(def.ordering.orderingDomain.includes('coingecko'), 'Default domain includes source');

  // Missing domain
  const broken = JSON.parse(JSON.stringify(env)) as ConstitutionalEnvelope;
  broken.ordering.orderingDomain = '';
  assert(!validateConstitutionalEnvelope(broken).valid, 'Empty ordering domain causes hard fail');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 21. ALL 17 BLOCKS PRESENT (constitutional completeness)
// ═══════════════════════════════════════════════════════════════════════════════

section('21. All 17 blocks present');
{
  const env = buildConstitutionalEnvelope(makeInput());
  const allBlocks = [
    'identity', 'sourceContext', 'canonicalContext', 'timing',
    'routeContext', 'authorityContext', 'payloadContext', 'replayContext',
    'validationContext', 'lineageContext',
    'observationSemantics', 'fieldLineage', 'normalizationOutcome',
    'temporalUncertainty', 'attestation', 'policyPins',
    'usageRights', 'disposition', 'supersession', 'ordering',
  ];
  for (const block of allBlocks) {
    assert((env as any)[block] !== undefined, `Block ${block} present`);
  }
  const res = validateConstitutionalEnvelope(env);
  assert(res.valid, 'Full 20-block envelope passes validation');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 22. STRESS: RANDOMIZED ENVELOPE CREATION
// ═══════════════════════════════════════════════════════════════════════════════

section('22. Stress: 200 random envelopes');
{
  resetAllLineageState();
  const sources = ['coingecko', 'coinglass', 'goplus', 'alchemy', 'lunarcrush', 'cryptopanic', 'dexscreener'];
  const entityTypes: Array<ConstitutionalEnvelope['sourceContext']['entityType']> = ['asset', 'pool', 'protocol', 'wallet', 'pair', 'narrative', 'market_event'];
  const modes: Array<ConstitutionalEnvelope['routeContext']['routeMode']> = ['realtime', 'scheduled', 'on_demand', 'backfill'];
  let allValid = true;
  let allAccepted = 0;

  for (let i = 0; i < 200; i++) {
    const src = sources[i % sources.length];
    const et = entityTypes[i % entityTypes.length];
    const mode = modes[i % modes.length];
    const env = buildConstitutionalEnvelope({
      source: src,
      providerId: `${src}_v1`,
      sourceClass: 'market_data',
      entityType: et,
      entityScope: 'exact_asset',
      canonicalCandidateIds: [`${et}:test-${i}`],
      connectorName: `${src}-connector`,
      connectorVersion: '1.0.0',
      rawPayload: { i, v: Math.random() },
      normalizedPayload: { i, n: true },
      observedAt: Date.now() - Math.floor(Math.random() * 60000),
      routeMode: mode,
    });
    const v = validateConstitutionalEnvelope(env);
    if (!v.valid) allValid = false;
    const ir = processEnvelopeIngress(env);
    if (ir.accepted) allAccepted++;
  }

  assert(allValid, 'All 200 random envelopes pass validation');
  assert(allAccepted === 200, 'All 200 unique envelopes accepted');
  assert(getReplayLedger().length === 200, 'Replay ledger has 200 entries');
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(60));
console.log(`L2.1 Constitutional Envelope Test Results: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(60));
if (failed > 0) {
  console.log('⚠️  SOME TESTS FAILED');
  process.exit(1);
} else {
  console.log('✅ ALL TESTS PASSED — L2.1 is constitutionally verified');
}
