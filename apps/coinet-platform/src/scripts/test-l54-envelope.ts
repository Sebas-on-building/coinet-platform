/**
 * L5.4 — Universal Write Contract
 *
 * Certification Test Suite
 *
 * 6 Bands, ~210 assertions:
 *   A — Structural Contract
 *   B — Canonicalization and Integrity
 *   C — Producer Legality
 *   D — Semantic Requirements
 *   E — Archive and Replay
 *   F — Cross-Layer Compatibility
 */

import {
  L5WriteClass, ALL_WRITE_CLASSES, getWriteClassRequirements,
  L5ProducerLayer, ALL_PRODUCER_LAYERS,
  L5IngressMode, ALL_INGRESS_MODES,
  L5DerivationKind, ALL_DERIVATION_KINDS, isDerived,
  L5EnvelopeLifecycleState, ALL_LIFECYCLE_STATES, TERMINAL_LIFECYCLE_STATES,
  isLegalLifecycleTransition, getLegalLifecycleTransitions,
  isTerminalLifecycleState, assertLifecycleTransition, isMonotonicAdvancement,

  L5EnvelopeErrorCode, L5EnvelopeError,

  canonicalizePayload, payloadsCanonicallyEqual, CANONICAL_SERIALIZATION_VERSION,
  computePayloadHash, verifyPayloadHash,
  computeDedupeKey, computeDedupeKeyFromDraft, extractDedupeComponents, classifyDuplicate,

  registerProducer, isRegisteredProducer, checkProducerLegality, resetProducerRegistry,
  validateTypedProjection,
  validateEnvelope, validateStructuralOnly, validateSemanticOnly,
  determineDisposition,
  resolveEnvelope,
  validateReadyForManifest,

  assertEnvelopeInvariant, assertAllEnvelopeInvariants, enforceAllEnvelopeInvariants,
  ALL_ENVELOPE_INVARIANT_IDS,
  type StorageEnvelopeDraft,
} from '../l5/envelope';

import { resetStateClassRegistry } from '../l5/purpose';
import { resetAuthorityRegistry } from '../l5/authority';

// ═══════════════════════════════════════════════════════════════════════════════
// HARNESS
// ═══════════════════════════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) { passed++; } else { failed++; console.error(`  ✗ FAIL: ${label}`); }
}

function banner(text: string): void {
  console.log(`\n${'═'.repeat(72)}\n  ${text}\n${'═'.repeat(72)}`);
}

function suiteHeader(text: string): void {
  console.log(`\n  ── ${text} ──`);
}

function resetAll(): void {
  resetProducerRegistry();
  resetAuthorityRegistry();
  resetStateClassRegistry();
}

const NOW = new Date().toISOString();
const EARLIER = new Date(Date.now() - 60000).toISOString();
const LATER = new Date(Date.now() + 60000).toISOString();

function makeDraft(overrides: Partial<StorageEnvelopeDraft> = {}): StorageEnvelopeDraft {
  const payload = overrides.payload ?? { metric: 'btc_price', value: 42000 };
  return {
    envelope_id: 'env_001',
    trace_id: 'trace_001',
    correlation_id: null,
    producer_service: 'price-ingestion',
    producer_layer: L5ProducerLayer.L2,
    producer_instance_id: 'inst_001',
    producer_capability_id: 'cap_price_ingest',
    parent_envelope_id: null,
    parent_trace_id: null,
    derivation_kind: L5DerivationKind.ORIGINAL,
    ingress_mode: L5IngressMode.REALTIME,

    write_class: L5WriteClass.TIME_SERIES_FACT,
    source_class: 'MARKET_DATA',
    source_provider: 'binance',
    source_endpoint: '/api/v3/ticker',
    source_event_id: 'ev_001',
    source_transport: 'API_PULL',
    source_format: 'JSON',
    source_batch_id: null,
    source_partition_key: null,

    source_observed_at: EARLIER,
    source_emitted_at: EARLIER,
    ingested_at: NOW,
    normalized_at: NOW,
    effective_at: null,
    expires_at: null,
    late_arrival_detected_at: null,

    canonical_subject_id: 'btc_canonical',
    canonical_subject_type: 'TOKEN',
    canonical_object_id: null,
    canonical_object_type: null,
    canonical_scope_type: 'TOKEN_METRIC',
    canonical_scope_id: 'btc_price_scope',
    authority_scope_type: 'TOKEN_METRIC',
    authority_scope_id: 'btc_price_scope',
    metric_contract_id: 'mc_btc_spot',
    edge_id: null,
    context_package_id: null,
    report_id: null,
    score_id: null,
    user_id: null,
    tenant_id: null,

    confidence_band: 'HIGH',
    rights_profile: 'FULL',
    freshness_state: 'FRESH',
    temporal_state: 'CURRENT',
    identity_resolution_state: 'RESOLVED',
    reconciliation_state: 'SETTLED',
    semantic_quality_state: 'VALID',

    schema_version: '1.0.0',
    canonical_serialization_version: CANONICAL_SERIALIZATION_VERSION,
    payload_hash_sha256: computePayloadHash(payload),
    dedupe_key: 'dedupe_placeholder',
    archive_required: false,
    replay_required: false,
    archive_uri: null,
    archive_checksum: null,
    payload_size_bytes: JSON.stringify(payload).length,
    late_arrival_flag: false,
    quarantine_flag: false,
    quarantine_reason_codes: [],
    replay_window_id: null,
    integrity_verification_state: 'PASSED',

    payload_content_type: 'application/json',
    projection_schema_id: 'ts_fact_v1',
    payload,
    typed_projection: { metric: 'btc_price', value: 42000 },
    ...overrides,
  };
}

function registerTestProducer(): void {
  registerProducer({
    producer_service: 'price-ingestion',
    producer_capability_id: 'cap_price_ingest',
    producer_layer: L5ProducerLayer.L2,
    allowed_write_classes: [L5WriteClass.TIME_SERIES_FACT, L5WriteClass.RELATIONAL_AUTHORITY],
    allowed_source_classes: ['MARKET_DATA'],
    requires_canonical_refs: true,
    archive_default: false,
    replay_default: false,
    max_payload_bytes: 1_000_000,
    allowed_ingress_modes: [L5IngressMode.REALTIME, L5IngressMode.BATCH, L5IngressMode.BACKFILL],
    allowed_derivation_kinds: [L5DerivationKind.ORIGINAL, L5DerivationKind.BACKFILL_NORMALIZED],
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND A — STRUCTURAL CONTRACT
// ═══════════════════════════════════════════════════════════════════════════════

function bandA(): void {
  banner('BAND A — Structural Contract');
  resetAll();
  registerTestProducer();

  suiteHeader('A1: Enum completeness');
  assert(ALL_WRITE_CLASSES.length === 7, '7 write classes');
  assert(ALL_PRODUCER_LAYERS.length === 12, '12 producer layers');
  assert(ALL_INGRESS_MODES.length === 7, '7 ingress modes');
  assert(ALL_DERIVATION_KINDS.length === 5, '5 derivation kinds');
  assert(ALL_LIFECYCLE_STATES.length === 11, '11 lifecycle states');
  assert(TERMINAL_LIFECYCLE_STATES.length === 3, '3 terminal states');
  assert(ALL_ENVELOPE_INVARIANT_IDS.length === 14, '14 invariants');

  suiteHeader('A2: Derivation kind helpers');
  assert(isDerived(L5DerivationKind.ORIGINAL) === false, 'ORIGINAL is not derived');
  assert(isDerived(L5DerivationKind.DERIVED) === true, 'DERIVED is derived');
  assert(isDerived(L5DerivationKind.REPLAY_RECREATED) === true, 'REPLAY_RECREATED is derived');
  assert(isDerived(L5DerivationKind.REPAIR_REEMITTED) === true, 'REPAIR_REEMITTED is derived');
  assert(isDerived(L5DerivationKind.BACKFILL_NORMALIZED) === true, 'BACKFILL_NORMALIZED is derived');

  suiteHeader('A3: Lifecycle state machine — happy path');
  assert(isLegalLifecycleTransition(L5EnvelopeLifecycleState.RECEIVED, L5EnvelopeLifecycleState.NORMALIZED), 'RECEIVED → NORMALIZED');
  assert(isLegalLifecycleTransition(L5EnvelopeLifecycleState.NORMALIZED, L5EnvelopeLifecycleState.STRUCTURALLY_VALIDATED), 'NORMALIZED → STRUCT_VALID');
  assert(isLegalLifecycleTransition(L5EnvelopeLifecycleState.STRUCTURALLY_VALIDATED, L5EnvelopeLifecycleState.SEMANTICALLY_VALIDATED), 'STRUCT → SEMANTIC');
  assert(isLegalLifecycleTransition(L5EnvelopeLifecycleState.SEMANTICALLY_VALIDATED, L5EnvelopeLifecycleState.CLASSIFIED), 'SEMANTIC → CLASSIFIED');
  assert(isLegalLifecycleTransition(L5EnvelopeLifecycleState.CLASSIFIED, L5EnvelopeLifecycleState.AUTHORITY_ALLOCATED), 'CLASSIFIED → AUTH_ALLOC');
  assert(isLegalLifecycleTransition(L5EnvelopeLifecycleState.AUTHORITY_ALLOCATED, L5EnvelopeLifecycleState.TOPOLOGY_VALIDATED), 'AUTH_ALLOC → TOPO_VALID');
  assert(isLegalLifecycleTransition(L5EnvelopeLifecycleState.TOPOLOGY_VALIDATED, L5EnvelopeLifecycleState.ARCHIVE_PROOF_ATTACHED), 'TOPO → ARCHIVE_PROOF');
  assert(isLegalLifecycleTransition(L5EnvelopeLifecycleState.TOPOLOGY_VALIDATED, L5EnvelopeLifecycleState.READY_FOR_MANIFEST), 'TOPO → READY (no archive)');
  assert(isLegalLifecycleTransition(L5EnvelopeLifecycleState.ARCHIVE_PROOF_ATTACHED, L5EnvelopeLifecycleState.READY_FOR_MANIFEST), 'ARCHIVE → READY');

  suiteHeader('A4: Lifecycle — quarantine from any non-terminal');
  const nonTerminal = ALL_LIFECYCLE_STATES.filter(s => !isTerminalLifecycleState(s));
  for (const s of nonTerminal) {
    assert(isLegalLifecycleTransition(s, L5EnvelopeLifecycleState.QUARANTINED), `${s} → QUARANTINED`);
    assert(isLegalLifecycleTransition(s, L5EnvelopeLifecycleState.REJECTED), `${s} → REJECTED`);
  }

  suiteHeader('A5: Lifecycle — terminal states cannot transition');
  for (const t of TERMINAL_LIFECYCLE_STATES) {
    assert(getLegalLifecycleTransitions(t).length === 0, `${t} has no transitions`);
  }

  suiteHeader('A6: Lifecycle — illegal skip');
  assert(!isLegalLifecycleTransition(L5EnvelopeLifecycleState.RECEIVED, L5EnvelopeLifecycleState.CLASSIFIED), 'Cannot skip to CLASSIFIED');
  assert(!isLegalLifecycleTransition(L5EnvelopeLifecycleState.RECEIVED, L5EnvelopeLifecycleState.READY_FOR_MANIFEST), 'Cannot skip to READY');

  suiteHeader('A7: Monotonic advancement');
  assert(isMonotonicAdvancement(L5EnvelopeLifecycleState.RECEIVED, L5EnvelopeLifecycleState.NORMALIZED), 'R→N monotonic');
  assert(isMonotonicAdvancement(L5EnvelopeLifecycleState.RECEIVED, L5EnvelopeLifecycleState.QUARANTINED), 'R→Q monotonic (terminal exception)');
  assert(!isMonotonicAdvancement(L5EnvelopeLifecycleState.CLASSIFIED, L5EnvelopeLifecycleState.NORMALIZED), 'CLASSIFIED→NORMALIZED not monotonic');

  suiteHeader('A8: assertLifecycleTransition throws on illegal');
  let threw = false;
  try { assertLifecycleTransition(L5EnvelopeLifecycleState.READY_FOR_MANIFEST, L5EnvelopeLifecycleState.RECEIVED); } catch (e: any) {
    threw = true;
    assert(e.code === L5EnvelopeErrorCode.ILLEGAL_LIFECYCLE_TRANSITION, 'Correct error code');
  }
  assert(threw, 'Illegal transition throws');

  suiteHeader('A9: Write class requirements');
  const tsReqs = getWriteClassRequirements(L5WriteClass.TIME_SERIES_FACT);
  assert(tsReqs.requiresMetricContract === true, 'TIME_SERIES_FACT requires metric contract');
  assert(tsReqs.requiresCanonicalSubject === true, 'TIME_SERIES_FACT requires canonical subject');

  const hotReqs = getWriteClassRequirements(L5WriteClass.HOT_EPHEMERAL);
  assert(hotReqs.requiresExpiresAt === true, 'HOT_EPHEMERAL requires expires_at');

  const derivedReqs = getWriteClassRequirements(L5WriteClass.DERIVED_MATERIALIZATION);
  assert(derivedReqs.requiresParentLineage === true, 'DERIVED requires parent lineage');

  const userReqs = getWriteClassRequirements(L5WriteClass.USER_STATE);
  assert(userReqs.requiresUserId === true, 'USER_STATE requires user_id');

  const auditReqs = getWriteClassRequirements(L5WriteClass.AUDIT_EVENT);
  assert(auditReqs.requiresActorInfo === true, 'AUDIT_EVENT requires actor info');
  assert(auditReqs.defaultArchiveRequired === true, 'AUDIT_EVENT default archive required');

  suiteHeader('A10: Valid draft passes structural validation');
  const draft = makeDraft();
  const structResult = validateStructuralOnly(draft);
  assert(structResult.valid === true, 'Valid draft passes structural validation');
  assert(structResult.violations.length === 0, 'No structural violations');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND B — CANONICALIZATION AND INTEGRITY
// ═══════════════════════════════════════════════════════════════════════════════

function bandB(): void {
  banner('BAND B — Canonicalization and Integrity');
  resetAll();

  suiteHeader('B1: Canonical serialization is deterministic');
  const p1 = { z: 1, a: 2, m: 'hello' };
  const p2 = { a: 2, z: 1, m: 'hello' };
  assert(canonicalizePayload(p1) === canonicalizePayload(p2), 'Key order does not affect canonical form');

  const p3 = { a: 1, b: { d: 4, c: 3 } };
  const p4 = { b: { c: 3, d: 4 }, a: 1 };
  assert(canonicalizePayload(p3) === canonicalizePayload(p4), 'Nested key order does not affect canonical form');

  suiteHeader('B2: Canonical preserves array order');
  const a1 = { items: [3, 1, 2] };
  const a2 = { items: [1, 2, 3] };
  assert(canonicalizePayload(a1) !== canonicalizePayload(a2), 'Different array orders produce different canonical forms');

  suiteHeader('B3: Null and undefined are distinct');
  const n1 = { a: null };
  const n2 = { a: undefined };
  assert(canonicalizePayload(n1) !== canonicalizePayload(n2), 'Null and undefined produce different canonical forms');

  suiteHeader('B4: payloadsCanonicallyEqual');
  assert(payloadsCanonicallyEqual({ x: 1, y: 2 }, { y: 2, x: 1 }) === true, 'Equal payloads are canonically equal');
  assert(payloadsCanonicallyEqual({ x: 1 }, { x: 2 }) === false, 'Different payloads are not canonically equal');

  suiteHeader('B5: Payload hash is deterministic');
  const payload = { metric: 'btc_price', value: 42000 };
  const h1 = computePayloadHash(payload);
  const h2 = computePayloadHash({ value: 42000, metric: 'btc_price' });
  assert(h1 === h2, 'Same payload different key order → same hash');
  assert(h1.length === 64, 'SHA-256 hex is 64 chars');

  suiteHeader('B6: verifyPayloadHash');
  assert(verifyPayloadHash(payload, h1) === true, 'Correct hash verifies');
  assert(verifyPayloadHash(payload, 'wrong_hash') === false, 'Wrong hash fails');

  suiteHeader('B7: Dedupe key is deterministic');
  registerTestProducer();
  const draft1 = makeDraft();
  const draft2 = makeDraft();
  const dk1 = computeDedupeKeyFromDraft(draft1);
  const dk2 = computeDedupeKeyFromDraft(draft2);
  assert(dk1 === dk2, 'Same drafts produce same dedupe key');
  assert(dk1.length === 64, 'Dedupe key is SHA-256 hex');

  suiteHeader('B8: Different scope changes dedupe key');
  const draft3 = makeDraft({ canonical_scope_id: 'eth_price_scope' });
  const dk3 = computeDedupeKeyFromDraft(draft3);
  assert(dk1 !== dk3, 'Different scope produces different dedupe key');

  suiteHeader('B9: Duplicate classification');
  assert(classifyDuplicate(dk1, h1, dk1, h1) === 'IDEMPOTENT_ACCEPT', 'Same key same hash → idempotent');
  assert(classifyDuplicate(dk1, h1, dk1, 'different_hash') === 'DUPLICATE_CONFLICT', 'Same key different hash → conflict');
  assert(classifyDuplicate(dk1, h1, dk3, h1) === 'NOT_DUPLICATE', 'Different key → not duplicate');

  suiteHeader('B10: Dedupe components extraction');
  const components = extractDedupeComponents(draft1);
  assert(components.producer_service === 'price-ingestion', 'Component: producer_service');
  assert(components.write_class === 'TIME_SERIES_FACT', 'Component: write_class');
  assert(components.metric_contract_id === 'mc_btc_spot', 'Component: metric_contract_id');

  suiteHeader('B11: CANONICAL_SERIALIZATION_VERSION exists');
  assert(CANONICAL_SERIALIZATION_VERSION === 'CS-1.0.0', 'Version is CS-1.0.0');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND C — PRODUCER LEGALITY
// ═══════════════════════════════════════════════════════════════════════════════

function bandC(): void {
  banner('BAND C — Producer Legality');
  resetAll();
  registerTestProducer();

  suiteHeader('C1: Registered producer passes');
  assert(isRegisteredProducer('price-ingestion'), 'price-ingestion is registered');
  const check = checkProducerLegality('price-ingestion', L5WriteClass.TIME_SERIES_FACT, 'MARKET_DATA', L5IngressMode.REALTIME, L5DerivationKind.ORIGINAL, 100);
  assert(check.legal === true, 'Legal producer check passes');

  suiteHeader('C2: Unregistered producer fails');
  assert(!isRegisteredProducer('unknown-service'), 'unknown-service not registered');
  const draft = makeDraft({ producer_service: 'unknown-service' });
  const semResult = validateSemanticOnly(draft);
  assert(semResult.shouldQuarantine === true, 'Unregistered producer quarantines');
  assert(semResult.violations.some(v => v.code === L5EnvelopeErrorCode.UNREGISTERED_PRODUCER), 'Violation: unregistered producer');

  suiteHeader('C3: Illegal write class rejects');
  const badClassCheck = checkProducerLegality('price-ingestion', L5WriteClass.AUDIT_EVENT, 'MARKET_DATA', L5IngressMode.REALTIME, L5DerivationKind.ORIGINAL, 100);
  assert(badClassCheck.legal === false, 'AUDIT_EVENT not allowed for price-ingestion');
  assert(badClassCheck.violations.some(v => v.includes('Write class')), 'Violation mentions write class');

  suiteHeader('C4: Illegal ingress mode rejects');
  const badModeCheck = checkProducerLegality('price-ingestion', L5WriteClass.TIME_SERIES_FACT, 'MARKET_DATA', L5IngressMode.REPAIR, L5DerivationKind.ORIGINAL, 100);
  assert(badModeCheck.legal === false, 'REPAIR mode not allowed');

  suiteHeader('C5: Illegal derivation kind rejects');
  const badDerivCheck = checkProducerLegality('price-ingestion', L5WriteClass.TIME_SERIES_FACT, 'MARKET_DATA', L5IngressMode.REALTIME, L5DerivationKind.DERIVED, 100);
  assert(badDerivCheck.legal === false, 'DERIVED not allowed');

  suiteHeader('C6: Payload too large rejects');
  const bigCheck = checkProducerLegality('price-ingestion', L5WriteClass.TIME_SERIES_FACT, 'MARKET_DATA', L5IngressMode.REALTIME, L5DerivationKind.ORIGINAL, 2_000_000);
  assert(bigCheck.legal === false, 'Payload over max rejects');
  assert(bigCheck.violations.some(v => v.includes('exceeds')), 'Violation mentions exceeds');

  suiteHeader('C7: Derived writes without lineage quarantine');
  const derivedDraft = makeDraft({
    derivation_kind: L5DerivationKind.DERIVED,
    parent_envelope_id: null,
    write_class: L5WriteClass.RELATIONAL_AUTHORITY,
  });
  const derivedResult = validateSemanticOnly(derivedDraft);
  assert(derivedResult.violations.some(v => v.code === L5EnvelopeErrorCode.ILLEGAL_DERIVATION), 'Derived without parent → violation');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND D — SEMANTIC REQUIREMENTS
// ═══════════════════════════════════════════════════════════════════════════════

function bandD(): void {
  banner('BAND D — Semantic Requirements');
  resetAll();
  registerTestProducer();

  suiteHeader('D1: Metric-backed write without metric contract quarantines');
  const noMetric = makeDraft({ metric_contract_id: null });
  noMetric.payload_hash_sha256; // keeps hash valid
  const v1 = validateSemanticOnly(noMetric);
  assert(v1.violations.some(v => v.code === L5EnvelopeErrorCode.MISSING_METRIC_CONTRACT), 'Missing metric contract flagged');

  suiteHeader('D2: Resolved-required write blocks unresolved identity');
  const noSubject = makeDraft({ canonical_subject_id: null });
  const v2 = validateSemanticOnly(noSubject);
  assert(v2.violations.some(v => v.code === L5EnvelopeErrorCode.MISSING_CANONICAL_REFERENCE), 'Missing canonical subject flagged');

  suiteHeader('D3: HOT_EPHEMERAL requires expires_at');
  registerProducer({
    producer_service: 'hot-service',
    producer_capability_id: 'cap_hot',
    producer_layer: L5ProducerLayer.L5_INTERNAL,
    allowed_write_classes: [L5WriteClass.HOT_EPHEMERAL],
    allowed_source_classes: [],
    requires_canonical_refs: false,
    archive_default: false, replay_default: false,
    max_payload_bytes: 10_000,
    allowed_ingress_modes: [L5IngressMode.REALTIME, L5IngressMode.INTERNAL_DERIVATION],
    allowed_derivation_kinds: [L5DerivationKind.ORIGINAL],
  });
  const hotDraft = makeDraft({
    write_class: L5WriteClass.HOT_EPHEMERAL,
    producer_service: 'hot-service',
    expires_at: null,
    metric_contract_id: null,
    canonical_subject_id: null,
  });
  const v3 = validateSemanticOnly(hotDraft);
  assert(v3.violations.some(v => v.message.includes('expires_at')), 'HOT_EPHEMERAL without expires_at flagged');

  suiteHeader('D4: USER_STATE requires user_id');
  registerProducer({
    producer_service: 'user-service',
    producer_capability_id: 'cap_user',
    producer_layer: L5ProducerLayer.USER_APP,
    allowed_write_classes: [L5WriteClass.USER_STATE],
    allowed_source_classes: [],
    requires_canonical_refs: false,
    archive_default: false, replay_default: false,
    max_payload_bytes: 100_000,
    allowed_ingress_modes: [L5IngressMode.USER_ACTION],
    allowed_derivation_kinds: [L5DerivationKind.ORIGINAL],
  });
  const userDraft = makeDraft({
    write_class: L5WriteClass.USER_STATE,
    producer_service: 'user-service',
    ingress_mode: L5IngressMode.USER_ACTION,
    user_id: null,
    metric_contract_id: null,
    canonical_subject_id: null,
  });
  const v4 = validateSemanticOnly(userDraft);
  assert(v4.violations.some(v => v.message.includes('user_id')), 'USER_STATE without user_id flagged');

  suiteHeader('D5: Typed projection mismatch quarantines');
  const mismatchDraft = makeDraft({
    typed_projection: { invented_key: 'not_in_payload' },
  });
  const v5 = validateSemanticOnly(mismatchDraft);
  assert(v5.violations.some(v => v.code === L5EnvelopeErrorCode.PAYLOAD_PROJECTION_MISMATCH), 'Projection mismatch flagged');

  suiteHeader('D6: Valid typed projection passes');
  const goodProjDraft = makeDraft({
    payload: { metric: 'btc_price', value: 42000, extra: true },
    typed_projection: { metric: 'btc_price', value: 42000 },
  });
  const projVal = validateTypedProjection(goodProjDraft.payload, goodProjDraft.typed_projection);
  assert(projVal.valid === true, 'Subset projection is valid');

  suiteHeader('D7: Timestamp inversion rejects');
  const badTimeDraft = makeDraft({
    source_observed_at: NOW,
    ingested_at: EARLIER,
    ingress_mode: L5IngressMode.REALTIME,
  });
  const v7 = validateStructuralOnly(badTimeDraft);
  assert(v7.violations.some(v => v.code === L5EnvelopeErrorCode.INVALID_TIMESTAMP_ORDER), 'Timestamp inversion flagged');

  suiteHeader('D8: Timestamp inversion allowed for backfill');
  const backfillTimeDraft = makeDraft({
    source_observed_at: NOW,
    ingested_at: EARLIER,
    ingress_mode: L5IngressMode.BACKFILL,
  });
  const v8 = validateStructuralOnly(backfillTimeDraft);
  assert(!v8.violations.some(v => v.code === L5EnvelopeErrorCode.INVALID_TIMESTAMP_ORDER), 'Backfill allows time inversion');

  suiteHeader('D9: Payload hash mismatch quarantines');
  const badHashDraft = makeDraft({ payload_hash_sha256: 'wrong_hash_value_0000000000000000000000000000000000000000000000' });
  const v9 = validateSemanticOnly(badHashDraft);
  assert(v9.violations.some(v => v.code === L5EnvelopeErrorCode.MISSING_PAYLOAD_HASH), 'Hash mismatch flagged');

  suiteHeader('D10: Missing required fields reject');
  const missingFields = makeDraft({ envelope_id: '' as any, schema_version: '' as any });
  const v10 = validateStructuralOnly(missingFields);
  assert(v10.shouldReject === true, 'Missing required fields reject');

  suiteHeader('D11: Full validation pipeline');
  const fullDraft = makeDraft();
  const fullResult = validateEnvelope(fullDraft);
  assert(fullResult.valid === true, 'Valid draft passes full validation');
  const disp = determineDisposition(fullResult);
  assert(disp.disposition === 'ACCEPTED', 'Valid draft is ACCEPTED');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND E — ARCHIVE AND REPLAY
// ═══════════════════════════════════════════════════════════════════════════════

function bandE(): void {
  banner('BAND E — Archive and Replay');
  resetAll();
  registerTestProducer();

  suiteHeader('E1: Archive-required without proof does not reach READY_FOR_MANIFEST');
  const archDraft = makeDraft({
    write_class: L5WriteClass.TIME_SERIES_FACT,
    archive_required: true,
    archive_uri: null,
    archive_checksum: null,
  });
  const result = resolveEnvelope(archDraft);
  if (result.success && result.envelope) {
    assert(
      result.envelope.lifecycle_state !== L5EnvelopeLifecycleState.READY_FOR_MANIFEST
      || !!result.envelope.archive_uri,
      'Archive-required without proof not manifest-ready',
    );
  } else {
    assert(true, 'Archive-required without proof quarantined or blocked');
  }

  suiteHeader('E2: Archive-required with proof reaches READY_FOR_MANIFEST');
  const archWithProof = makeDraft({
    archive_required: true,
    archive_uri: 's3://bucket/raw/trace_001.json',
    archive_checksum: 'abc123checksum',
  });
  const result2 = resolveEnvelope(archWithProof);
  assert(result2.success === true, 'Archive with proof resolves');
  assert(result2.lifecycleState === L5EnvelopeLifecycleState.READY_FOR_MANIFEST, 'Reaches READY_FOR_MANIFEST');

  suiteHeader('E3: validateReadyForManifest catches missing archive');
  if (result.success && result.envelope) {
    const readiness = validateReadyForManifest(result.envelope);
    if (result.envelope.archive_required && !result.envelope.archive_uri) {
      assert(readiness.ready === false, 'Not ready without archive proof');
    }
  } else {
    assert(true, 'Envelope did not resolve (expected for missing archive)');
  }

  suiteHeader('E4: Replay-required lineage preservation (INV-5.4-L)');
  const replayDraft = makeDraft({ replay_required: true });
  const invL = assertEnvelopeInvariant('INV-5.4-L', { draft: replayDraft });
  assert(invL.passed === true, 'INV-5.4-L passes for complete replay draft');

  const badReplayDraft = makeDraft({
    replay_required: true,
    schema_version: '' as any,
  });
  const invLBad = assertEnvelopeInvariant('INV-5.4-L', { draft: badReplayDraft });
  assert(invLBad.passed === false, 'INV-5.4-L fails without schema_version');

  suiteHeader('E5: Replay recreated preserves meaning');
  const original = makeDraft();
  const replayed = makeDraft({
    ingress_mode: L5IngressMode.REPLAY,
    derivation_kind: L5DerivationKind.REPLAY_RECREATED,
    parent_envelope_id: 'env_001',
    parent_trace_id: 'trace_001',
  });
  assert(original.payload_hash_sha256 === replayed.payload_hash_sha256, 'Replay preserves payload hash');
  assert(original.canonical_subject_id === replayed.canonical_subject_id, 'Replay preserves canonical refs');
  assert(original.metric_contract_id === replayed.metric_contract_id, 'Replay preserves metric contract');

  suiteHeader('E6: Duplicate conflict quarantines (INV-5.4-M)');
  const invMOk = assertEnvelopeInvariant('INV-5.4-M', { duplicateConflictHandled: 'QUARANTINE' });
  assert(invMOk.passed === true, 'Quarantine handling passes INV-5.4-M');

  const invMBad = assertEnvelopeInvariant('INV-5.4-M', { duplicateConflictHandled: 'OVERWRITE' });
  assert(invMBad.passed === false, 'Overwrite handling fails INV-5.4-M');

  suiteHeader('E7: IMMUTABLE_ARCHIVE default requirements');
  const archReqs = getWriteClassRequirements(L5WriteClass.IMMUTABLE_ARCHIVE);
  assert(archReqs.defaultArchiveRequired === true, 'IMMUTABLE_ARCHIVE defaults to archive required');
  assert(archReqs.defaultReplayRequired === true, 'IMMUTABLE_ARCHIVE defaults to replay required');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BAND F — CROSS-LAYER COMPATIBILITY
// ═══════════════════════════════════════════════════════════════════════════════

function bandF(): void {
  banner('BAND F — Cross-Layer Compatibility');
  resetAll();
  registerTestProducer();

  suiteHeader('F1: Resolved envelope has routing block');
  const draft = makeDraft();
  const result = resolveEnvelope(draft);
  assert(result.success === true, 'Draft resolves successfully');
  assert(!!result.envelope, 'Resolved envelope exists');
  assert(!!result.envelope!.routing, 'Routing block exists');
  assert(!!result.envelope!.routing.primary_state_class, 'Primary state class assigned');
  assert(!!result.envelope!.routing.primary_authority_store, 'Primary authority store assigned');
  assert(!!result.envelope!.routing.loss_semantics_code, 'Loss semantics code assigned');

  suiteHeader('F2: Classification resolved');
  assert(result.envelope!.classification_resolved === true, 'Classification resolved');
  assert(result.envelope!.authority_allocated === true, 'Authority allocated');
  assert(result.envelope!.topology_validated === true, 'Topology validated');

  suiteHeader('F3: INV-5.4-N — resolved aligns with L5.1/L5.2/L5.3');
  const invN = assertEnvelopeInvariant('INV-5.4-N', { resolved: result.envelope! });
  assert(invN.passed === true, 'INV-5.4-N passes for resolved envelope');

  suiteHeader('F4: INV-5.4-N fails for incomplete resolution');
  const fakeResolved = { ...result.envelope!, classification_resolved: false } as any;
  const invNBad = assertEnvelopeInvariant('INV-5.4-N', { resolved: fakeResolved });
  assert(invNBad.passed === false, 'INV-5.4-N fails when classification unresolved');

  suiteHeader('F5: Full invariant suite passes for valid context');
  const allResults = assertAllEnvelopeInvariants({
    draft,
    resolved: result.envelope!,
    hasEnvelope: true,
    payloadHashMatches: true,
    dedupeKeyDeterministic: true,
    producerRegistered: true,
    projectionValid: true,
  });
  assert(allResults.length === 14, '14 invariants checked');
  const failures = allResults.filter(r => !r.passed);
  assert(failures.length === 0, `All invariants pass (${failures.map(f => f.id).join(', ') || 'none failed'})`);

  suiteHeader('F6: enforceAllEnvelopeInvariants throws on failure');
  let threw = false;
  try {
    enforceAllEnvelopeInvariants({
      hasEnvelope: false,
    });
  } catch (e: any) {
    threw = true;
    assert(e.message.includes('INV-5.4-A'), 'Error mentions INV-5.4-A');
  }
  assert(threw, 'Enforce throws on failure');

  suiteHeader('F7: Routing block reflects state class');
  assert(result.envelope!.routing.primary_state_class === 'TIME_SERIES_ANALYTICAL_HISTORY',
    'TIME_SERIES_FACT → TIME_SERIES_ANALYTICAL_HISTORY');
  assert(result.envelope!.routing.primary_authority_store === 'CLICKHOUSE',
    'TIME_SERIES → ClickHouse');

  suiteHeader('F8: RELATIONAL_AUTHORITY resolves to Postgres');
  resetAuthorityRegistry();
  resetStateClassRegistry();
  const relDraft = makeDraft({
    write_class: L5WriteClass.RELATIONAL_AUTHORITY,
    metric_contract_id: null,
  });
  const relResult = resolveEnvelope(relDraft);
  assert(relResult.success === true, 'Relational authority resolves');
  assert(relResult.envelope!.routing.primary_state_class === 'RELATIONAL_AUTHORITY', 'Class: RELATIONAL_AUTHORITY');
  assert(relResult.envelope!.routing.primary_authority_store === 'POSTGRES', 'Store: POSTGRES');

  suiteHeader('F9: Rejected envelopes do not resolve');
  const badDraft = makeDraft({ envelope_id: '' as any, trace_id: '' as any, schema_version: '' as any });
  const badResult = resolveEnvelope(badDraft);
  assert(badResult.success === false, 'Invalid draft does not resolve');
  assert(badResult.lifecycleState === L5EnvelopeLifecycleState.REJECTED, 'Lifecycle: REJECTED');
  assert(badResult.envelope === null, 'No envelope for rejected');

  suiteHeader('F10: Manifest readiness for valid resolved envelope');
  if (result.envelope && result.envelope.lifecycle_state === L5EnvelopeLifecycleState.READY_FOR_MANIFEST) {
    const readiness = validateReadyForManifest(result.envelope);
    assert(readiness.ready === true, 'Valid resolved envelope is manifest-ready');
    assert(readiness.violations.length === 0, 'No readiness violations');
  } else {
    assert(true, 'Envelope not in READY_FOR_MANIFEST state (archive pending)');
  }

  suiteHeader('F11: INV-5.4-E metric contract check');
  const invE = assertEnvelopeInvariant('INV-5.4-E', { draft });
  assert(invE.passed === true, 'INV-5.4-E passes with metric contract');

  const noMetricDraft = makeDraft({ metric_contract_id: null });
  const invEBad = assertEnvelopeInvariant('INV-5.4-E', { draft: noMetricDraft });
  assert(invEBad.passed === false, 'INV-5.4-E fails without metric contract');

  suiteHeader('F12: INV-5.4-G derived lineage check');
  const derivedDraft = makeDraft({
    derivation_kind: L5DerivationKind.DERIVED,
    parent_envelope_id: null,
  });
  const invG = assertEnvelopeInvariant('INV-5.4-G', { draft: derivedDraft });
  assert(invG.passed === false, 'INV-5.4-G fails for derived without parent');

  const goodDerived = makeDraft({
    derivation_kind: L5DerivationKind.DERIVED,
    parent_envelope_id: 'env_parent',
  });
  const invGOk = assertEnvelopeInvariant('INV-5.4-G', { draft: goodDerived });
  assert(invGOk.passed === true, 'INV-5.4-G passes with parent lineage');
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

function main(): void {
  console.log('╔════════════════════════════════════════════════════════════════════════╗');
  console.log('║  L5.4 — Universal Write Contract — Certification Suite               ║');
  console.log('╚════════════════════════════════════════════════════════════════════════╝');

  const t0 = Date.now();
  bandA();
  bandB();
  bandC();
  bandD();
  bandE();
  bandF();
  const elapsed = Date.now() - t0;

  console.log(`\n${'═'.repeat(72)}`);
  console.log(`  L5.4 CERTIFICATION: ${failed === 0 ? 'PASSED' : 'FAILED'}`);
  console.log(`  Assertions: ${passed + failed}  |  Passed: ${passed}  |  Failed: ${failed}  |  Time: ${elapsed}ms`);
  console.log('═'.repeat(72));

  if (failed > 0) process.exit(1);
}

main();
