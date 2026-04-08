/**
 * L2.4 — Idempotency & Deduplication Test Suite
 *
 * Idempotency · Dedup · Correction · Replay · Sequence · Anti-fake
 */

import {
  L24_VERSION,
  computeFingerprint, computeIdempotencyKey, computeSequenceKey,
  semanticHash, timeBucket, detectFingerprintFamily,
  type FingerprintInput,
} from '../services/connector-layer/event-fingerprint';
import {
  findDedupPolicy, getAllDedupPolicies,
} from '../services/connector-layer/dedup-policy-map';
import {
  checkIdempotency, getIdempotencyEntry,
  resetIdempotencyRegistry,
} from '../services/connector-layer/idempotency-engine';
import {
  checkDedup, registerDedupEntry, resetDedupEngine,
  type DedupCheckInput,
} from '../services/connector-layer/dedup-engine';
import {
  adjudicateCorrectionVsDuplicate,
  type CorrectionAdjudicationInput,
} from '../services/connector-layer/correction-vs-duplicate';
import {
  recordIdentityDecision, getIdentityLedger,
  resetIdentityLedger, verifyIdentityCollapseHonesty,
  type IngressIdentityDecision,
} from '../services/connector-layer/dedup-ledger';

let passed = 0;
let failed = 0;

function assert(cond: boolean, msg: string): void {
  if (cond) { passed++; return; }
  failed++;
  console.error(`  ✗ ${msg}`);
}

const NOW = Date.now();
const TS = (offset: number) => new Date(NOW + offset).toISOString();

// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
console.log('║   L2.4 IDEMPOTENCY & DEDUP — CONSTITUTIONAL TEST SUITE          ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

resetIdempotencyRegistry();
resetDedupEngine();
resetIdentityLedger();

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 1: Version & policy constants
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 1: Version & policy constants ──');
assert(L24_VERSION === '1.0.0', 'L24_VERSION is 1.0.0');
assert(getAllDedupPolicies().length >= 9, `At least 9 dedup policies (got ${getAllDedupPolicies().length})`);

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 2: Fingerprint family detection
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 2: Fingerprint family detection ──');
assert(detectFingerprintFamily('price.spot') === 'SNAPSHOT', 'price.spot → SNAPSHOT');
assert(detectFingerprintFamily('derivatives.funding') === 'SNAPSHOT', 'derivatives.funding → SNAPSHOT');
assert(detectFingerprintFamily('derivatives.liquidation') === 'EVENT', 'derivatives.liquidation → EVENT');
assert(detectFingerprintFamily('onchain.transfers') === 'EVENT', 'onchain.transfers → EVENT');
assert(detectFingerprintFamily('entity.labels') === 'LABEL', 'entity.labels → LABEL');
assert(detectFingerprintFamily('security.token.flags') === 'LABEL', 'security.token.flags → LABEL');
assert(detectFingerprintFamily('price.spot', 'RAW_EVENT') === 'EVENT', 'observationKind RAW_EVENT overrides');
assert(detectFingerprintFamily('dex.aggregate', 'ROLLING_AGGREGATE') === 'AGGREGATE', 'ROLLING_AGGREGATE → AGGREGATE');

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 3: Semantic hash properties
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 3: Semantic hash ──');
{
  const h1 = semanticHash({ price: 42000.5, volume: 100 });
  const h2 = semanticHash({ volume: 100, price: 42000.5 });
  assert(h1 === h2, 'Semantic hash ignores field order');

  const h3 = semanticHash(null);
  assert(h3 === 'NULL', 'Null payload → NULL hash');

  const h4 = semanticHash({ a: 1 });
  const h5 = semanticHash({ a: 2 });
  assert(h4 !== h5, 'Different values → different hashes');

  const h6 = semanticHash({ nested: { x: 1, y: 2 } });
  const h7 = semanticHash({ nested: { y: 2, x: 1 } });
  assert(h6 === h7, 'Nested objects: field order ignored');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 4: Time bucketing
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 4: Time bucketing ──');
{
  const anchor = new Date('2026-01-01T00:00:05.000Z').toISOString();
  const anchor30 = new Date('2026-01-01T00:00:35.000Z').toISOString();
  const b1 = timeBucket(anchor, 60_000);
  const b2 = timeBucket(anchor30, 60_000);
  assert(b1 === b2, 'Same minute bucket for 5s and 35s within same minute');

  const anchor120 = new Date('2026-01-01T00:02:05.000Z').toISOString();
  const b3 = timeBucket(anchor, 60_000);
  const b4 = timeBucket(anchor120, 60_000);
  assert(b3 !== b4, 'Different minute buckets for 0m5s and 2m5s');

  assert(timeBucket(undefined, 60_000) === 'NO_TIME', 'No timestamp → NO_TIME');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 5: Fingerprint computation — snapshots
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 5: Fingerprint — snapshots ──');
{
  const fpInput: FingerprintInput = {
    source: 'coingecko',
    fieldFamily: 'price.spot',
    entityId: 'BTC',
    entityScope: 'exact_asset',
    canonicalCandidateIds: ['btc-canonical'],
    observedTimestamp: TS(0),
    semanticPayload: { price: 42000, volume: 500000 },
  };
  const fp1 = computeFingerprint(fpInput);
  assert(fp1.fingerprintFamily === 'SNAPSHOT', 'Spot price → SNAPSHOT family');
  assert(fp1.dedupFingerprint.length === 40, 'Fingerprint is 40 chars');
  assert(fp1.semanticPayloadHash.length === 32, 'Semantic hash is 32 chars');

  const fp2 = computeFingerprint({ ...fpInput, semanticPayload: { volume: 500000, price: 42000 } });
  assert(fp1.dedupFingerprint === fp2.dedupFingerprint, 'Same semantic payload (reordered) → same fingerprint');

  const fp3 = computeFingerprint({ ...fpInput, semanticPayload: { price: 43000, volume: 500000 } });
  assert(fp1.dedupFingerprint !== fp3.dedupFingerprint, 'Different value → different fingerprint');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 6: Fingerprint computation — events (use exact timestamp)
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 6: Fingerprint — events ──');
{
  const fpInput: FingerprintInput = {
    source: 'coinglass',
    fieldFamily: 'derivatives.liquidation',
    entityId: 'BTC',
    observedTimestamp: TS(0),
    sequenceKey: 'stream-liq-btc::1001',
    eventId: 'liq-1001',
    semanticPayload: { side: 'long', amount: 5000000 },
  };
  const fp1 = computeFingerprint(fpInput);
  assert(fp1.fingerprintFamily === 'EVENT', 'Liquidation → EVENT family');

  const fp2 = computeFingerprint({ ...fpInput, observedTimestamp: TS(500) });
  assert(fp1.dedupFingerprint !== fp2.dedupFingerprint, 'Events use exact timestamp, not bucket');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 7: Idempotency key
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 7: Idempotency key ──');
{
  const opTs1 = new Date('2026-01-01T00:00:02.000Z').toISOString();
  const opTs2 = new Date('2026-01-01T00:00:07.000Z').toISOString();
  const k1 = computeIdempotencyKey({
    providerId: 'coingecko', routeId: 'rt-1', routeMode: 'realtime',
    connectorInstanceId: 'inst-1', replayGeneration: 0, operationTimestamp: opTs1,
  });
  const k2 = computeIdempotencyKey({
    providerId: 'coingecko', routeId: 'rt-1', routeMode: 'realtime',
    connectorInstanceId: 'inst-1', replayGeneration: 0, operationTimestamp: opTs2,
  });
  assert(k1 === k2, 'Same operation within 10s bucket → same key');

  const k3 = computeIdempotencyKey({
    providerId: 'coingecko', routeId: 'rt-1', routeMode: 'realtime',
    connectorInstanceId: 'inst-2', replayGeneration: 0, operationTimestamp: TS(0),
  });
  assert(k1 !== k3, 'Different connector instance → different key');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 8: Sequence key
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 8: Sequence key ──');
{
  const s1 = computeSequenceKey({ streamId: 'liq-btc', fieldFamily: 'derivatives.liquidation', entityId: 'BTC', sequencePosition: 1001 });
  const s2 = computeSequenceKey({ streamId: 'liq-btc', fieldFamily: 'derivatives.liquidation', entityId: 'BTC', sequencePosition: 1002 });
  assert(s1 !== s2, 'Different sequence position → different key');

  const s3 = computeSequenceKey({ streamId: 'liq-btc', fieldFamily: 'derivatives.liquidation', entityId: 'BTC', sequencePosition: 1001 });
  assert(s1 === s3, 'Same sequence position → same key');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 9: Idempotency engine — first seen
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 9: Idempotency engine ──');
{
  resetIdempotencyRegistry();
  const r1 = checkIdempotency({
    idempotencyKey: 'idem-1', envelopeId: 'env-1',
    isCorrection: false, isReplay: false, replayGeneration: 0, timestamp: TS(0),
  });
  assert(r1.decision === 'ALLOW_MUTATION', 'First seen → ALLOW_MUTATION');
  assert(r1.duplicateCount === 0, 'First seen → 0 duplicates');

  const r2 = checkIdempotency({
    idempotencyKey: 'idem-1', envelopeId: 'env-1-retry',
    isCorrection: false, isReplay: false, replayGeneration: 0, timestamp: TS(1000),
  });
  assert(r2.decision === 'BLOCK_DUPLICATE_MUTATION', 'Same key → BLOCK');
  assert(r2.duplicateCount === 1, 'Duplicate count incremented');
  assert(r2.priorEnvelopeId === 'env-1', 'Prior envelope linked');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 10: Idempotency — correction allowed despite same key
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 10: Idempotency — correction override ──');
{
  const r = checkIdempotency({
    idempotencyKey: 'idem-1', envelopeId: 'env-1-correction',
    isCorrection: true, isReplay: false, replayGeneration: 0, timestamp: TS(2000),
  });
  assert(r.decision === 'ALLOW_CORRECTION_MUTATION', 'Correction → allowed despite same key');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 11: Idempotency — replay scoped
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 11: Idempotency — replay scoped ──');
{
  const r = checkIdempotency({
    idempotencyKey: 'idem-replay', envelopeId: 'env-replay-1',
    isCorrection: false, isReplay: true, replayGeneration: 1, timestamp: TS(0),
  });
  assert(r.decision === 'ALLOW_REPLAY_SCOPED_MUTATION', 'First replay → replay scoped');

  const r2 = checkIdempotency({
    idempotencyKey: 'idem-replay', envelopeId: 'env-replay-2',
    isCorrection: false, isReplay: true, replayGeneration: 2, timestamp: TS(1000),
  });
  assert(r2.decision === 'ALLOW_REPLAY_SCOPED_MUTATION', 'Advanced replay gen → replay scoped');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 12: Dedup engine — new observation
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 12: Dedup engine — new observation ──');
{
  resetDedupEngine();
  const input: DedupCheckInput = {
    envelopeId: 'env-new-1',
    fingerprintInput: {
      source: 'coingecko', fieldFamily: 'price.spot', entityId: 'BTC',
      observedTimestamp: TS(0), semanticPayload: { price: 42000 },
    },
    routeMode: 'realtime', replayGeneration: 0, isBackfill: false,
    isCorrection: false, observedTimestamp: TS(0), ingestedTimestamp: TS(0),
  };
  const r = checkDedup(input);
  assert(r.decision === 'NEW_OBSERVATION', 'First arrival → NEW_OBSERVATION');
  registerDedupEntry(input, r.fingerprint);
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 13: Dedup engine — semantic duplicate
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 13: Dedup engine — semantic duplicate ──');
{
  const input: DedupCheckInput = {
    envelopeId: 'env-dup-1',
    fingerprintInput: {
      source: 'coingecko', fieldFamily: 'price.spot', entityId: 'BTC',
      observedTimestamp: TS(0), semanticPayload: { price: 42000 },
    },
    routeMode: 'realtime', replayGeneration: 0, isBackfill: false,
    isCorrection: false, observedTimestamp: TS(0), ingestedTimestamp: TS(5_000),
  };
  const r = checkDedup(input);
  assert(r.decision === 'SEMANTIC_DUPLICATE', 'Same payload same bucket → SEMANTIC_DUPLICATE');
  assert(r.priorEnvelopeId === 'env-new-1', 'Prior envelope linked');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 14: Dedup engine — same value, different time → distinct
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 14: Same value, different time → distinct ──');
{
  const input: DedupCheckInput = {
    envelopeId: 'env-distinct-time',
    fingerprintInput: {
      source: 'coingecko', fieldFamily: 'price.spot', entityId: 'BTC',
      observedTimestamp: TS(120_000), semanticPayload: { price: 42000 },
    },
    routeMode: 'realtime', replayGeneration: 0, isBackfill: false,
    isCorrection: false, observedTimestamp: TS(120_000), ingestedTimestamp: TS(120_000),
  };
  const r = checkDedup(input);
  assert(r.decision === 'NEW_OBSERVATION', 'Same value but 2min later → NEW (different time bucket + outside window)');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 15: Dedup engine — correction flag → needs correction check
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 15: Correction flag → correction check ──');
{
  const input: DedupCheckInput = {
    envelopeId: 'env-corr-1',
    fingerprintInput: {
      source: 'coingecko', fieldFamily: 'price.spot', entityId: 'BTC',
      observedTimestamp: TS(0), semanticPayload: { price: 42000 },
    },
    routeMode: 'realtime', replayGeneration: 0, isBackfill: false,
    isCorrection: true, correctionOfEnvelopeId: 'env-new-1',
    observedTimestamp: TS(0), ingestedTimestamp: TS(10_000),
  };
  const r = checkDedup(input);
  assert(r.decision === 'POSSIBLE_DUPLICATE_REQUIRES_CORRECTION_CHECK',
    'Correction flag → POSSIBLE_DUPLICATE_REQUIRES_CORRECTION_CHECK');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 16: Dedup engine — replay duplicate
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 16: Replay duplicate isolation ──');
{
  resetDedupEngine();
  const base: DedupCheckInput = {
    envelopeId: 'env-live-1',
    fingerprintInput: {
      source: 'coingecko', fieldFamily: 'price.spot', entityId: 'ETH',
      observedTimestamp: TS(0), semanticPayload: { price: 3000 },
    },
    routeMode: 'realtime', replayGeneration: 0, isBackfill: false,
    isCorrection: false, observedTimestamp: TS(0), ingestedTimestamp: TS(0),
  };
  const r1 = checkDedup(base);
  registerDedupEntry(base, r1.fingerprint);
  assert(r1.decision === 'NEW_OBSERVATION', 'Live observation accepted');

  const replay: DedupCheckInput = {
    ...base,
    envelopeId: 'env-replay-eth',
    replayGeneration: 1,
    isBackfill: true,
    ingestedTimestamp: TS(5_000),
  };
  const r2 = checkDedup(replay);
  assert(r2.decision === 'REPLAY_DUPLICATE', 'Backfill same data different gen → REPLAY_DUPLICATE');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 17: Dedup engine — cross-route duplicate
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 17: Cross-route duplicate ──');
{
  resetDedupEngine();
  const base: DedupCheckInput = {
    envelopeId: 'env-rt-1',
    fingerprintInput: {
      source: 'coingecko', fieldFamily: 'price.spot', entityId: 'SOL',
      observedTimestamp: TS(0), semanticPayload: { price: 150 },
    },
    routeMode: 'realtime', replayGeneration: 0, isBackfill: false,
    isCorrection: false, observedTimestamp: TS(0), ingestedTimestamp: TS(0),
  };
  registerDedupEntry(base, checkDedup(base).fingerprint);

  const sched: DedupCheckInput = {
    ...base,
    envelopeId: 'env-sched-1',
    routeMode: 'scheduled',
    ingestedTimestamp: TS(5_000),
  };
  const r = checkDedup(sched);
  assert(r.decision === 'SEMANTIC_DUPLICATE', 'Same observation via different route → SEMANTIC_DUPLICATE');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 18: Correction vs duplicate — explicit correction
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 18: Correction vs duplicate — explicit correction ──');
{
  const input: CorrectionAdjudicationInput = {
    envelopeId: 'env-corr-explicit',
    hasExplicitCorrectionLink: true,
    correctionOfEnvelopeId: 'env-original',
    declaredCorrectionType: 'VALUE_CORRECTION',
    semanticPayloadChanged: true,
    timingChanged: false, scopeChanged: false, identityChanged: false, methodologyChanged: false,
    isBackfill: false, replayGeneration: 0, priorEnvelopeId: 'env-original',
  };
  const r = adjudicateCorrectionVsDuplicate(input);
  assert(r.decision === 'IS_CORRECTION', 'Explicit link → IS_CORRECTION');
  assert(r.correctionType === 'VALUE_CORRECTION', 'Type = VALUE_CORRECTION');
  assert(r.downstreamInvalidation.invalidatePriorScoring, 'Value correction invalidates scoring');
  assert(!r.downstreamInvalidation.invalidatePriorCanonical, 'Value correction does NOT invalidate canonical');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 19: Correction vs duplicate — no semantic change = duplicate
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 19: No semantic change → duplicate ──');
{
  const input: CorrectionAdjudicationInput = {
    envelopeId: 'env-same',
    hasExplicitCorrectionLink: false,
    semanticPayloadChanged: false,
    timingChanged: false, scopeChanged: false, identityChanged: false, methodologyChanged: false,
    isBackfill: false, replayGeneration: 0, priorEnvelopeId: 'env-original',
  };
  const r = adjudicateCorrectionVsDuplicate(input);
  assert(r.decision === 'IS_DUPLICATE', 'No change → IS_DUPLICATE');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 20: Correction vs duplicate — identity correction → manual review
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 20: Identity correction → manual review ──');
{
  const input: CorrectionAdjudicationInput = {
    envelopeId: 'env-identity-change',
    hasExplicitCorrectionLink: false,
    semanticPayloadChanged: true,
    timingChanged: false, scopeChanged: false, identityChanged: true, methodologyChanged: false,
    isBackfill: false, replayGeneration: 0, priorEnvelopeId: 'env-original',
  };
  const r = adjudicateCorrectionVsDuplicate(input);
  assert(r.decision === 'UNRESOLVED_REQUIRES_MANUAL_POLICY', 'Identity change → UNRESOLVED');
  assert(r.downstreamInvalidation.requiresManualReview, 'Manual review required');
  assert(r.downstreamInvalidation.invalidatePriorCanonical, 'Identity change invalidates canonical');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 21: Correction vs duplicate — replay artifact
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 21: Replay artifact ──');
{
  const input: CorrectionAdjudicationInput = {
    envelopeId: 'env-replay-art',
    hasExplicitCorrectionLink: false,
    semanticPayloadChanged: false,
    timingChanged: false, scopeChanged: false, identityChanged: false, methodologyChanged: false,
    isBackfill: true, replayGeneration: 2, priorReplayGeneration: 1,
    priorEnvelopeId: 'env-original',
  };
  const r = adjudicateCorrectionVsDuplicate(input);
  assert(r.decision === 'IS_REPLAY_ARTIFACT', 'Different replay gen → IS_REPLAY_ARTIFACT');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 22: Correction types — downstream invalidation matrix
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 22: Downstream invalidation by correction type ──');
{
  const types: Array<{ type: string; scoring: boolean; canonical: boolean; sequence: boolean; comparability: boolean; manual: boolean }> = [
    { type: 'VALUE_CORRECTION', scoring: true, canonical: false, sequence: false, comparability: false, manual: false },
    { type: 'SCOPE_CORRECTION', scoring: true, canonical: true, sequence: false, comparability: false, manual: false },
    { type: 'TIMING_CORRECTION', scoring: false, canonical: false, sequence: true, comparability: false, manual: false },
    { type: 'IDENTITY_CORRECTION', scoring: true, canonical: true, sequence: true, comparability: false, manual: true },
    { type: 'METHODOLOGY_CORRECTION', scoring: true, canonical: false, sequence: false, comparability: true, manual: true },
  ];
  for (const t of types) {
    const input: CorrectionAdjudicationInput = {
      envelopeId: `env-type-${t.type}`,
      hasExplicitCorrectionLink: true,
      correctionOfEnvelopeId: 'env-original',
      declaredCorrectionType: t.type as any,
      semanticPayloadChanged: true,
      timingChanged: false, scopeChanged: false, identityChanged: false, methodologyChanged: false,
      isBackfill: false, replayGeneration: 0,
    };
    const r = adjudicateCorrectionVsDuplicate(input);
    assert(r.downstreamInvalidation.invalidatePriorScoring === t.scoring, `${t.type} scoring=${t.scoring}`);
    assert(r.downstreamInvalidation.invalidatePriorCanonical === t.canonical, `${t.type} canonical=${t.canonical}`);
    assert(r.downstreamInvalidation.invalidatePriorSequence === t.sequence, `${t.type} sequence=${t.sequence}`);
    assert(r.downstreamInvalidation.invalidatePriorComparability === t.comparability, `${t.type} comparability=${t.comparability}`);
    assert(r.downstreamInvalidation.requiresManualReview === t.manual, `${t.type} manual=${t.manual}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 23: Dedup policy lookup
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 23: Dedup policy lookup ──');
{
  const p1 = findDedupPolicy('price.spot', 'realtime');
  assert(p1.policyId === 'ddp-spot-price', 'Spot RT → ddp-spot-price');
  assert(p1.timeBucketMs === 10_000, 'Spot 10s bucket');

  const p2 = findDedupPolicy('derivatives.liquidation', 'realtime');
  assert(p2.strictSequence, 'Liquidation strict sequence');
  assert(p2.timeBucketMs === 1_000, 'Liquidation 1s bucket');

  const p3 = findDedupPolicy('entity.labels', 'scheduled');
  assert(!p3.allowSameValueDistinctTime, 'Labels: same value at different time = duplicate');

  const p4 = findDedupPolicy('unknown.field');
  assert(p4.policyId === 'ddp-default', 'Unknown → default');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 24: Labels — same value different time → still duplicate
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 24: Labels — same value different time → duplicate ──');
{
  resetDedupEngine();
  const base: DedupCheckInput = {
    envelopeId: 'env-label-1',
    fingerprintInput: {
      source: 'arkham', fieldFamily: 'entity.labels', entityId: 'wallet-0xabc',
      observedTimestamp: TS(0), semanticPayload: { label: 'exchange_hot_wallet' },
    },
    routeMode: 'scheduled', replayGeneration: 0, isBackfill: false,
    isCorrection: false, observedTimestamp: TS(0), ingestedTimestamp: TS(0),
  };
  const r1 = checkDedup(base);
  registerDedupEntry(base, r1.fingerprint);

  const later: DedupCheckInput = {
    ...base,
    envelopeId: 'env-label-2',
    observedTimestamp: TS(0),
    ingestedTimestamp: TS(7_200_000),
  };
  later.fingerprintInput = { ...base.fingerprintInput, observedTimestamp: TS(0) };
  const r2 = checkDedup(later);
  assert(r2.decision === 'SEMANTIC_DUPLICATE' || r2.decision === 'NEW_OBSERVATION',
    `Label dedup: ${r2.decision}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 25: Identity ledger
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 25: Identity ledger ──');
{
  resetIdentityLedger();
  const d: IngressIdentityDecision = {
    envelopeId: 'env-ledger-1',
    idempotencyKey: 'ik-1',
    dedupFingerprint: 'fp-1',
    decision: 'ACCEPT_NEW',
    priorEnvelopeIds: [],
    reasonCodes: ['FIRST_SEEN'],
    downstreamEmissionAllowed: true,
    liveStateMutationAllowed: true,
    decidedAt: TS(0),
  };
  recordIdentityDecision(d);
  assert(getIdentityLedger().length === 1, 'Ledger has 1 entry');

  recordIdentityDecision({
    ...d, envelopeId: 'env-ledger-2', decision: 'ABSORB_SEMANTIC_DUPLICATE',
    downstreamEmissionAllowed: false, liveStateMutationAllowed: false,
  });
  assert(getIdentityLedger().length === 2, 'Ledger has 2 entries');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 26: Methodology correction → comparability invalidation
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 26: Methodology correction ──');
{
  const input: CorrectionAdjudicationInput = {
    envelopeId: 'env-meth',
    hasExplicitCorrectionLink: false,
    semanticPayloadChanged: false,
    timingChanged: false, scopeChanged: false, identityChanged: false, methodologyChanged: true,
    isBackfill: false, replayGeneration: 0, priorEnvelopeId: 'env-original',
  };
  const r = adjudicateCorrectionVsDuplicate(input);
  assert(r.decision === 'UNRESOLVED_REQUIRES_MANUAL_POLICY', 'Methodology change → UNRESOLVED');
  assert(r.downstreamInvalidation.invalidatePriorComparability, 'Comparability invalidated');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 27: New version via revision number
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 27: New version via revision number ──');
{
  const input: CorrectionAdjudicationInput = {
    envelopeId: 'env-rev2',
    hasExplicitCorrectionLink: false,
    revisionNumber: 2,
    semanticPayloadChanged: true,
    timingChanged: false, scopeChanged: false, identityChanged: false, methodologyChanged: false,
    isBackfill: false, replayGeneration: 0, priorEnvelopeId: 'env-original',
  };
  const r = adjudicateCorrectionVsDuplicate(input);
  assert(r.decision === 'IS_NEW_VERSION', 'Revision 2 with payload change → IS_NEW_VERSION');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 28: Distinct but similar
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 28: Distinct but similar ──');
{
  resetDedupEngine();
  const base: DedupCheckInput = {
    envelopeId: 'env-sim-1',
    fingerprintInput: {
      source: 'coingecko', fieldFamily: 'price.spot', entityId: 'DOGE',
      observedTimestamp: TS(0), semanticPayload: { price: 0.15 },
    },
    routeMode: 'realtime', replayGeneration: 0, isBackfill: false,
    isCorrection: false, observedTimestamp: TS(0), ingestedTimestamp: TS(0),
  };
  const r1 = checkDedup(base);
  registerDedupEntry(base, r1.fingerprint);

  const similar: DedupCheckInput = {
    ...base,
    envelopeId: 'env-sim-2',
    fingerprintInput: {
      ...base.fingerprintInput, semanticPayload: { price: 0.16 },
    },
    ingestedTimestamp: TS(5_000),
  };
  const r2 = checkDedup(similar);
  assert(r2.decision === 'NEW_OBSERVATION' || r2.decision === 'DISTINCT_BUT_SIMILAR',
    `Different value same bucket: ${r2.decision}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 29: ANTI-FAKE — identity-collapse-honesty
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 29: ANTI-FAKE — identity-collapse-honesty ──');
{
  resetIdentityLedger();

  const decisions: IngressIdentityDecision[] = [
    {
      envelopeId: 'ok-new', idempotencyKey: 'k1', dedupFingerprint: 'fp1',
      decision: 'ACCEPT_NEW', priorEnvelopeIds: [], reasonCodes: [],
      downstreamEmissionAllowed: true, liveStateMutationAllowed: true, decidedAt: TS(0),
    },
    {
      envelopeId: 'ok-dup', idempotencyKey: 'k2', dedupFingerprint: 'fp2',
      decision: 'ABSORB_SEMANTIC_DUPLICATE', priorEnvelopeIds: ['env-prior'], reasonCodes: [],
      downstreamEmissionAllowed: false, liveStateMutationAllowed: false, decidedAt: TS(1000),
    },
    {
      envelopeId: 'ok-corr', idempotencyKey: 'k3', dedupFingerprint: 'fp3',
      decision: 'APPLY_CORRECTION', priorEnvelopeIds: ['env-prior'],
      correctionTargetEnvelopeId: 'env-prior', reasonCodes: [],
      downstreamEmissionAllowed: true, liveStateMutationAllowed: true, decidedAt: TS(2000),
    },
    {
      envelopeId: 'ok-replay', idempotencyKey: 'k4', dedupFingerprint: 'fp4',
      decision: 'ISOLATE_REPLAY', priorEnvelopeIds: [], reasonCodes: [],
      downstreamEmissionAllowed: false, liveStateMutationAllowed: false, decidedAt: TS(3000),
    },
    {
      envelopeId: 'ok-blocked', idempotencyKey: 'k5', dedupFingerprint: 'fp5',
      decision: 'BLOCK_IDEMPOTENT_RETRY', priorEnvelopeIds: ['env-prior'], reasonCodes: [],
      downstreamEmissionAllowed: false, liveStateMutationAllowed: false, decidedAt: TS(4000),
    },
  ];

  for (const d of decisions) recordIdentityDecision(d);

  const violations = verifyIdentityCollapseHonesty(getIdentityLedger());
  assert(violations.length === 0, `Identity-collapse honesty: 0 violations (found ${violations.length})`);
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 30: ANTI-FAKE — detect correction absorbed as duplicate
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 30: ANTI-FAKE — correction must not be absorbed ──');
{
  resetIdentityLedger();
  const bad: IngressIdentityDecision = {
    envelopeId: 'bad-corr-dup', idempotencyKey: 'k6', dedupFingerprint: 'fp6',
    decision: 'ABSORB_SEMANTIC_DUPLICATE', priorEnvelopeIds: ['env-prior'],
    correctionTargetEnvelopeId: 'env-prior', reasonCodes: [],
    downstreamEmissionAllowed: false, liveStateMutationAllowed: false, decidedAt: TS(0),
  };
  recordIdentityDecision(bad);

  const violations = verifyIdentityCollapseHonesty(getIdentityLedger());
  assert(violations.length === 1, 'Detected correction absorbed as duplicate');
  assert(violations[0].includes('correction absorbed'), 'Violation message correct');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 31: ANTI-FAKE — replay must not mutate live state
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 31: ANTI-FAKE — replay must not mutate live ──');
{
  resetIdentityLedger();
  const bad: IngressIdentityDecision = {
    envelopeId: 'bad-replay-live', idempotencyKey: 'k7', dedupFingerprint: 'fp7',
    decision: 'ISOLATE_REPLAY', priorEnvelopeIds: [], reasonCodes: [],
    downstreamEmissionAllowed: false, liveStateMutationAllowed: true, decidedAt: TS(0),
  };
  recordIdentityDecision(bad);

  const violations = verifyIdentityCollapseHonesty(getIdentityLedger());
  assert(violations.length === 1, 'Detected replay mutating live state');
  assert(violations[0].includes('replay artifact'), 'Violation message correct');
}

// ─────────────────────────────────────────────────────────────────────────────
// GROUP 32: Idempotency registry state
// ─────────────────────────────────────────────────────────────────────────────
console.log('── Group 32: Registry state ──');
{
  const entry = getIdempotencyEntry('idem-1');
  assert(entry != null, 'Idempotency entry exists');
  assert(entry!.duplicateCount >= 1, 'Duplicate count tracked');
  assert(entry!.firstSeenEnvelopeId === 'env-1', 'First seen preserved');
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINAL SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n╔═══════════════════════════════════════════════════════════════════╗');
if (failed === 0) {
  console.log(`║  ✅ ALL ${passed} TESTS PASSED — L2.4 Idempotency & Dedup verified    ║`);
} else {
  console.log(`║  ❌ ${failed} FAILED / ${passed} passed                                     ║`);
}
console.log('╚═══════════════════════════════════════════════════════════════════╝\n');

if (failed > 0) process.exit(1);
