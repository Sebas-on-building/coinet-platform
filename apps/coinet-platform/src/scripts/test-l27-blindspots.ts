/**
 * L2.7 — Fallback & Blind-Spot Signaling: Constitutional Verification Suite
 *
 * Tests: blind-spot detection, fallback semantics, fingerprint dedup,
 * propagation, lineage augmentation, and anti-fake honesty invariants.
 */

import {
  evaluateFallbackSemantics,
  type FallbackEvalInput,
  type FallbackEquivalence,
} from '../services/connector-layer/fallback-semantics';

import {
  computeBlindSpotFingerprint,
  dedupBlindSpot,
  resetFingerprintRegistry,
  getFingerprintCount,
  type BlindSpotFingerprintInput,
} from '../services/connector-layer/blindspot-fingerprint';

import {
  compileBlindSpots,
  recordBlindSpots,
  getBlindSpotLedger,
  getBlindSpotsByRequest,
  getBlindSpotsBySeverity,
  resetBlindSpotLedger,
  type BlindSpotEngineInput,
  type RouteOutcome,
  type EnvelopeOutcome,
} from '../services/connector-layer/blindspot-engine';

import {
  propagateBlindSpots,
  verifyPropagationHonesty,
} from '../services/connector-layer/blindspot-propagation';

// ═══════════════════════════════════════════════════════════════════════════════
// HARNESS
// ═══════════════════════════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, label: string): void {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(label);
    console.error(`  ❌ FAIL: ${label}`);
  }
}

function group(name: string, fn: () => void): void {
  console.log(`\n── ${name}`);
  fn();
}

function resetAll(): void {
  resetFingerprintRegistry();
  resetBlindSpotLedger();
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function makeFallbackInput(overrides: Partial<FallbackEvalInput> = {}): FallbackEvalInput {
  return {
    requestId: 'req-1',
    traceId: 'trace-1',
    originalRouteId: 'route-orig',
    originalRouteMode: 'REALTIME',
    fallbackRouteId: 'route-fb',
    fallbackRouteMode: 'SCHEDULED',
    fieldFamily: 'derivatives.funding',
    originalConnector: 'coinglass-ws',
    fallbackConnector: 'coinglass-poll',
    originalRouteState: 'R0_PREFERRED',
    fallbackRouteState: 'R1_AVAILABLE',
    originalProvenanceScore: 0.95,
    fallbackProvenanceScore: 0.60,
    fallbackBlindSpots: [],
    ...overrides,
  };
}

function makeRouteOutcome(overrides: Partial<RouteOutcome> = {}): RouteOutcome {
  return {
    routeTraceId: 'rt-1',
    selectedRouteMode: 'REALTIME',
    selectedConnector: 'coinglass-ws',
    routeState: 'R0_PREFERRED',
    provenanceScore: 0.95,
    blindSpotFlags: [],
    fallbackUsed: false,
    ...overrides,
  };
}

function makeEnvelopeOutcome(overrides: Partial<EnvelopeOutcome> = {}): EnvelopeOutcome {
  return {
    envelopeTraceId: 'et-1',
    envelopeId: 'env-1',
    routeTraceId: 'rt-1',
    providerId: 'coinglass',
    sourceClass: 'DERIVATIVES_AGGREGATOR',
    fieldFamily: 'derivatives.funding',
    ingressDisposition: 'SURVIVED',
    lineageComplete: true,
    affectedEntities: ['BTC'],
    ...overrides,
  };
}

function makeEngineInput(
  routes: RouteOutcome[] = [],
  envelopes: EnvelopeOutcome[] = [],
  overrides: Partial<BlindSpotEngineInput> = {},
): BlindSpotEngineInput {
  return {
    requestId: 'req-test',
    traceId: 'trace-test',
    requestedFieldFamilies: ['derivatives.funding'],
    requestedEntities: ['BTC'],
    routeOutcomes: routes,
    envelopeOutcomes: envelopes,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('╔═══════════════════════════════════════════════════════════════════╗');
console.log('║  L2.7 Fallback & Blind-Spot Signaling — Verification Suite       ║');
console.log('╚═══════════════════════════════════════════════════════════════════╝');

// ── A. FALLBACK SEMANTICS ───────────────────────────────────────────────────

group('1. Fully equivalent fallback (same mode, same connector)', () => {
  const rec = evaluateFallbackSemantics(makeFallbackInput({
    fallbackRouteMode: 'REALTIME',
    fallbackConnector: 'coinglass-ws',
  }));
  assert(rec.equivalence === 'FULLY_EQUIVALENT', 'Equivalence is FULLY_EQUIVALENT');
  assert(rec.whatWasLost.length === 0, 'Nothing was lost');
  assert(!rec.disclosureRequired, 'No disclosure required');
  assert(rec.claimConstraints.length === 0, 'No claim constraints');
});

group('2. Near-equivalent fallback (same mode, different connector, close provenance)', () => {
  const rec = evaluateFallbackSemantics(makeFallbackInput({
    fallbackRouteMode: 'REALTIME',
    fallbackConnector: 'coinglass-poll',
    fallbackProvenanceScore: 0.90,
  }));
  assert(rec.equivalence === 'NEAR_EQUIVALENT', 'Equivalence is NEAR_EQUIVALENT');
  assert(rec.disclosureRequired, 'Disclosure required');
  assert(rec.claimConstraints.includes('DISPLAY_CONSTRAINED'), 'Display constrained');
});

group('3. Degraded-equivalent fallback (REALTIME → SCHEDULED, moderate provenance gap)', () => {
  const rec = evaluateFallbackSemantics(makeFallbackInput());
  assert(rec.equivalence === 'DEGRADED_EQUIVALENT', 'Equivalence is DEGRADED_EQUIVALENT');
  assert(rec.whatWasLost.some(l => l.includes('Realtime')), 'Lost realtime visibility');
  assert(rec.semanticLoss.some(l => l.includes('Sequence')), 'Sequence integrity in semantic loss');
  assert(rec.claimConstraints.includes('SCORING_CONSTRAINED'), 'Scoring constrained');
  assert(rec.claimConstraints.includes('CONTRADICTION_WEIGHT_REDUCED'), 'Contradiction weight reduced');
  assert(rec.disclosureRequired, 'Disclosure required');
});

group('4. Partial-only fallback (REALTIME → SCHEDULED, large provenance gap)', () => {
  const rec = evaluateFallbackSemantics(makeFallbackInput({
    fallbackProvenanceScore: 0.40,
  }));
  assert(rec.equivalence === 'PARTIAL_ONLY', 'Equivalence is PARTIAL_ONLY');
  assert(rec.claimConstraints.includes('DIRECTIONAL_CLAIM_BLOCKED'), 'Directional claim blocked');
  assert(rec.claimConstraints.includes('SCENARIO_CONFIRMATION_BLOCKED'), 'Scenario blocked');
});

group('5. Non-equivalent fallback (REALTIME → BACKFILL)', () => {
  const rec = evaluateFallbackSemantics(makeFallbackInput({
    fallbackRouteMode: 'BACKFILL',
  }));
  assert(rec.equivalence === 'NON_EQUIVALENT', 'Equivalence is NON_EQUIVALENT');
  assert(rec.claimConstraints.includes('SAFETY_VERDICT_BLOCKED'), 'Safety verdict blocked');
  assert(rec.claimConstraints.includes('IDENTITY_ASSERTION_BLOCKED'), 'Identity assertion blocked');
  assert(rec.semanticLoss.includes('Truth-kind changed — not legal replacement'), 'Semantic loss explains truth-kind change');
});

group('6. Prohibited fallback', () => {
  const rec = evaluateFallbackSemantics(makeFallbackInput({
    fallbackRouteState: 'R5_PROHIBITED',
  }));
  assert(rec.equivalence === 'PROHIBITED', 'Equivalence is PROHIBITED');
  assert(rec.claimConstraints.includes('REPLAY_ONLY'), 'Replay only');
});

group('7. Disclosure text is meaningful', () => {
  const rec = evaluateFallbackSemantics(makeFallbackInput());
  assert(rec.disclosureText.includes('REALTIME'), 'Disclosure mentions original mode');
  assert(rec.disclosureText.includes('SCHEDULED'), 'Disclosure mentions fallback mode');
  assert(rec.disclosureText.includes('derivatives.funding'), 'Disclosure mentions field family');
});

group('8. Reason codes encode equivalence and route mode change', () => {
  const rec = evaluateFallbackSemantics(makeFallbackInput());
  assert(rec.reasonCodes.some(c => c.includes('DEGRADED_EQUIVALENT')), 'Reason includes equivalence class');
  assert(rec.reasonCodes.includes('ROUTE_MODE_CHANGE'), 'Reason includes route mode change');
});

// ── B. BLIND-SPOT FINGERPRINT ───────────────────────────────────────────────

group('9. Stable fingerprint for same inputs', () => {
  resetAll();
  const fpInput: BlindSpotFingerprintInput = {
    requestId: 'req-1', traceId: 'trace-1',
    type: 'OWNER_UNAVAILABLE', cause: 'OWNER_FAILURE',
    scope: 'FIELD_FAMILY', severity: 'CRITICAL',
    sourceClass: 'MARKET_SURFACE', fieldFamily: 'spot.price',
  };
  const fp1 = computeBlindSpotFingerprint(fpInput);
  const fp2 = computeBlindSpotFingerprint(fpInput);
  assert(fp1.fingerprint === fp2.fingerprint, 'Same inputs produce same fingerprint');
  assert(fp1.fingerprint.startsWith('bsfp-'), 'Fingerprint has correct prefix');
});

group('10. Different inputs produce different fingerprints', () => {
  const fpA = computeBlindSpotFingerprint({
    requestId: 'req-1', traceId: 'trace-1',
    type: 'OWNER_UNAVAILABLE', cause: 'OWNER_FAILURE',
    scope: 'FIELD_FAMILY', severity: 'CRITICAL',
  });
  const fpB = computeBlindSpotFingerprint({
    requestId: 'req-1', traceId: 'trace-1',
    type: 'ROUTE_DEGRADED', cause: 'FALLBACK_ROUTE_CHANGE',
    scope: 'FIELD_FAMILY', severity: 'MEDIUM',
  });
  assert(fpA.fingerprint !== fpB.fingerprint, 'Different blind-spot types produce different fingerprints');
});

group('11. Dedup registry absorbs duplicates', () => {
  resetAll();
  const fp = computeBlindSpotFingerprint({
    requestId: 'r1', traceId: 't1',
    type: 'ROUTE_DEGRADED', cause: 'FALLBACK_ROUTE_CHANGE',
    scope: 'FIELD_FAMILY', severity: 'MEDIUM',
  });
  const d1 = dedupBlindSpot('bs-1', fp);
  assert(!d1.isDuplicate, 'First occurrence is not duplicate');
  assert(d1.occurrenceCount === 1, 'First occurrence count is 1');

  const d2 = dedupBlindSpot('bs-2', fp);
  assert(d2.isDuplicate, 'Second occurrence is duplicate');
  assert(d2.occurrenceCount === 2, 'Second occurrence count is 2');
  assert(d2.firstBlindSpotId === 'bs-1', 'Points to first blind spot id');
  assert(getFingerprintCount() === 1, 'Registry has one unique fingerprint');
});

// ── C. BLIND-SPOT ENGINE ────────────────────────────────────────────────────

group('12. Route degradation emits ROUTE_DEGRADED blind spot', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome({ routeState: 'R2_DEGRADED' })],
    [makeEnvelopeOutcome()],
  ));
  assert(result.blindSpots.some(bs => bs.type === 'ROUTE_DEGRADED'), 'ROUTE_DEGRADED detected');
  assert(result.summary.medium > 0, 'Medium severity in summary');
});

group('13. Partial route emits HIGH severity blind spot', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome({ routeState: 'R3_PARTIAL' })],
    [makeEnvelopeOutcome()],
  ));
  const bs = result.blindSpots.find(b => b.type === 'ROUTE_DEGRADED');
  assert(bs !== undefined, 'ROUTE_DEGRADED found');
  assert(bs!.severity === 'HIGH', 'Severity is HIGH for partial route');
});

group('14. Route probation emits blind spot', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome({ routeProbationState: 'RECOVERING_PROBATION' })],
    [makeEnvelopeOutcome()],
  ));
  assert(result.blindSpots.some(bs => bs.cause === 'ROUTE_RESTORATION_PROBATION'), 'Probation blind spot detected');
});

group('15. Fallback with semantic loss emits blind spot and fallback record', () => {
  resetAll();
  const fbInput = makeFallbackInput();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome({
      fallbackUsed: true,
      fallbackInput: fbInput,
    })],
    [makeEnvelopeOutcome()],
  ));
  assert(result.fallbackSemantics.length === 1, 'One fallback semantics record');
  assert(result.fallbackSemantics[0].equivalence === 'DEGRADED_EQUIVALENT', 'Degraded equivalence');
  assert(result.blindSpots.some(bs => bs.type === 'FALLBACK_WITH_SEMANTIC_LOSS'), 'Fallback blind spot emitted');
});

group('16. Fully equivalent fallback does NOT emit blind spot', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome({
      fallbackUsed: true,
      fallbackInput: makeFallbackInput({
        fallbackRouteMode: 'REALTIME',
        fallbackConnector: 'coinglass-ws',
      }),
    })],
    [makeEnvelopeOutcome()],
  ));
  assert(!result.blindSpots.some(bs => bs.type === 'FALLBACK_WITH_SEMANTIC_LOSS'),
    'No fallback blind spot for fully equivalent');
});

group('17. Freshness F4_UNUSABLE emits CRITICAL NO_LEGAL_SUBSTITUTE', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome()],
    [makeEnvelopeOutcome({ freshnessState: 'F4_UNUSABLE' })],
  ));
  const bs = result.blindSpots.find(b => b.type === 'NO_LEGAL_SUBSTITUTE');
  assert(bs !== undefined, 'NO_LEGAL_SUBSTITUTE emitted');
  assert(bs!.severity === 'CRITICAL', 'Severity is CRITICAL');
  assert(bs!.claimConstraints.includes('DIRECTIONAL_CLAIM_BLOCKED'), 'Directional blocked');
  assert(bs!.cause === 'FRESHNESS_LOSS', 'Cause is FRESHNESS_LOSS');
});

group('18. Freshness F3 emits PARTIAL_FIELD_MISSING with HIGH severity', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome()],
    [makeEnvelopeOutcome({ freshnessState: 'F3_STALE_AND_CONSTRAINED' })],
  ));
  const bs = result.blindSpots.find(b => b.cause === 'FRESHNESS_LOSS');
  assert(bs !== undefined, 'Freshness-loss blind spot emitted');
  assert(bs!.severity === 'HIGH', 'Severity is HIGH');
  assert(bs!.claimConstraints.includes('SCENARIO_CONFIRMATION_BLOCKED'), 'Scenario blocked');
});

group('19. Incomplete lineage emits TRACE_INCOMPLETE', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome()],
    [makeEnvelopeOutcome({ lineageComplete: false })],
  ));
  const bs = result.blindSpots.find(b => b.type === 'TRACE_INCOMPLETE');
  assert(bs !== undefined, 'TRACE_INCOMPLETE emitted');
  assert(bs!.severity === 'HIGH', 'Severity is HIGH');
  assert(bs!.claimConstraints.includes('REPLAY_ONLY'), 'Replay only constraint');
});

group('20. Replay-isolated envelope emits HISTORICAL_GAP', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome()],
    [makeEnvelopeOutcome({ identityVerdict: 'ISOLATE_REPLAY' })],
  ));
  assert(result.blindSpots.some(bs => bs.type === 'HISTORICAL_GAP'), 'HISTORICAL_GAP emitted');
});

group('21. Unresolved canonical state emits PARTIAL_FIELD_MISSING', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome()],
    [makeEnvelopeOutcome({ canonicalResolutionState: 'unresolved' })],
  ));
  const bs = result.blindSpots.find(b => b.cause === 'PARTIAL_NORMALIZATION');
  assert(bs !== undefined, 'Partial normalization blind spot emitted');
  assert(bs!.claimConstraints.includes('IDENTITY_ASSERTION_BLOCKED'), 'Identity assertion blocked');
});

group('22. Missing field family emits OWNER_UNAVAILABLE', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome()],
    [makeEnvelopeOutcome({ fieldFamily: 'protocol.tvl' })],
    { requestedFieldFamilies: ['derivatives.funding'] },
  ));
  const bs = result.blindSpots.find(b => b.type === 'OWNER_UNAVAILABLE');
  assert(bs !== undefined, 'OWNER_UNAVAILABLE emitted for missing family');
  assert(bs!.severity === 'CRITICAL', 'Severity is CRITICAL');
  assert(bs!.fieldFamily === 'derivatives.funding', 'Correct field family');
  assert(bs!.affectedEntities.includes('BTC'), 'Affected entities populated');
});

group('23. Summary correctly counts severities', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome({ routeState: 'R2_DEGRADED' })],
    [makeEnvelopeOutcome({ freshnessState: 'F4_UNUSABLE', lineageComplete: false })],
  ));
  assert(result.summary.totalBlindSpots >= 3, 'At least 3 blind spots');
  assert(result.summary.critical >= 1, 'At least 1 critical');
  assert(result.summary.high >= 1, 'At least 1 high');
  assert(result.summary.medium >= 1, 'At least 1 medium');
});

group('24. Deduplication collapses identical blind spots', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [
      makeRouteOutcome({ routeTraceId: 'rt-a', routeState: 'R2_DEGRADED' }),
      makeRouteOutcome({ routeTraceId: 'rt-a', routeState: 'R2_DEGRADED' }),
    ],
    [makeEnvelopeOutcome()],
  ));
  const degraded = result.blindSpots.filter(bs => bs.type === 'ROUTE_DEGRADED');
  assert(degraded.length === 1, 'Duplicate blind spots collapsed to one');
});

group('25. Ledger stores and queries blind spots', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome({ routeState: 'R2_DEGRADED' })],
    [makeEnvelopeOutcome({ freshnessState: 'F4_UNUSABLE' })],
  ));
  recordBlindSpots(result.blindSpots);
  assert(getBlindSpotLedger().length === result.blindSpots.length, 'Ledger has all blind spots');
  assert(getBlindSpotsByRequest('req-test').length === result.blindSpots.length, 'Query by request works');
  assert(getBlindSpotsBySeverity('CRITICAL').length >= 1, 'Query by severity works');
});

// ── D. PROPAGATION ──────────────────────────────────────────────────────────

group('26. Propagation produces audit log entry for every blind spot', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome({ routeState: 'R2_DEGRADED' })],
    [makeEnvelopeOutcome({ freshnessState: 'F4_UNUSABLE' })],
  ));
  const prop = propagateBlindSpots(result.blindSpots, result.summary);
  const auditEffects = prop.effects.filter(e => e.target === 'AUDIT_LOG');
  assert(auditEffects.length >= result.blindSpots.length, 'Every blind spot has audit entry');
});

group('27. Blind spots with disclosure produce UI badge effects', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [],
    [makeEnvelopeOutcome({ freshnessState: 'F4_UNUSABLE' })],
  ));
  const prop = propagateBlindSpots(result.blindSpots, result.summary);
  const uiEffects = prop.effects.filter(e => e.target === 'UI_BADGES');
  assert(uiEffects.length >= 1, 'UI badge effects present');
});

group('28. SCORING_CONSTRAINED propagates to CONFIDENCE_BANDS and JUDGMENT_LAYER', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome({
      fallbackUsed: true,
      fallbackInput: makeFallbackInput(),
    })],
    [makeEnvelopeOutcome()],
  ));
  const prop = propagateBlindSpots(result.blindSpots, result.summary);
  assert(prop.effects.some(e => e.target === 'CONFIDENCE_BANDS'), 'Confidence bands affected');
  assert(prop.effects.some(e => e.target === 'JUDGMENT_LAYER'), 'Judgment layer affected');
});

group('29. SCENARIO_CONFIRMATION_BLOCKED propagates to SCENARIO_ENGINE', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome({ routeState: 'R3_PARTIAL' })],
    [makeEnvelopeOutcome()],
  ));
  const prop = propagateBlindSpots(result.blindSpots, result.summary);
  assert(prop.effects.some(e => e.target === 'SCENARIO_ENGINE' && e.effectType === 'SCENARIO_CONFIRMATION_BLOCK'),
    'Scenario engine receives block');
});

group('30. OWNER_UNAVAILABLE / NO_LEGAL_SUBSTITUTE produces ALERTS effect', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome()],
    [],
    { requestedFieldFamilies: ['derivatives.funding'], requestedEntities: ['ETH'] },
  ));
  const prop = propagateBlindSpots(result.blindSpots, result.summary);
  assert(prop.effects.some(e => e.target === 'ALERTS'), 'Alerts target present for owner unavailable');
});

group('31. TRACE_INCOMPLETE produces JUDGMENT_LAYER traceability warning', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome()],
    [makeEnvelopeOutcome({ lineageComplete: false })],
  ));
  const prop = propagateBlindSpots(result.blindSpots, result.summary);
  assert(prop.effects.some(e =>
    e.target === 'JUDGMENT_LAYER' && e.effectType === 'TRACEABILITY_WARNING'),
    'Judgment layer receives traceability warning');
});

group('32. Confidence haircut scales with severity', () => {
  resetAll();
  const lowResult = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome({ routeState: 'R2_DEGRADED' })],
    [makeEnvelopeOutcome()],
  ));
  const lowProp = propagateBlindSpots(lowResult.blindSpots, lowResult.summary);

  resetAll();
  const highResult = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome({ routeState: 'R2_DEGRADED' })],
    [makeEnvelopeOutcome({ freshnessState: 'F4_UNUSABLE', lineageComplete: false })],
  ));
  const highProp = propagateBlindSpots(highResult.blindSpots, highResult.summary);

  assert(highProp.confidenceHaircut > lowProp.confidenceHaircut,
    'More severe blind spots produce larger haircut');
});

group('33. Lineage augmentation carries all blind spot ids', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome({ routeState: 'R3_PARTIAL' })],
    [makeEnvelopeOutcome({ freshnessState: 'F3_STALE_AND_CONSTRAINED' })],
  ));
  const prop = propagateBlindSpots(result.blindSpots, result.summary);
  for (const bs of result.blindSpots) {
    assert(prop.lineageAugmentation.activeBlindSpotIds.includes(bs.blindSpotId),
      `Lineage augmentation includes ${bs.blindSpotId}`);
  }
});

group('34. Lineage augmentation carries disclosure summaries', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome({
      fallbackUsed: true,
      fallbackInput: makeFallbackInput(),
    })],
    [makeEnvelopeOutcome()],
  ));
  const prop = propagateBlindSpots(result.blindSpots, result.summary);
  assert(prop.lineageAugmentation.disclosureSummaries.length >= 1, 'Disclosure summaries present');
});

group('35. Confidence haircut capped at 1.0', () => {
  resetAll();
  const massiveInput = makeEngineInput(
    Array.from({ length: 10 }, (_, i) => makeRouteOutcome({
      routeTraceId: `rt-${i}`,
      routeState: 'R3_PARTIAL',
      fallbackUsed: true,
      fallbackInput: makeFallbackInput({
        originalRouteId: `orig-${i}`,
        fallbackRouteId: `fb-${i}`,
        fallbackRouteMode: 'BACKFILL',
      }),
    })),
    Array.from({ length: 10 }, (_, i) => makeEnvelopeOutcome({
      envelopeTraceId: `et-${i}`,
      envelopeId: `env-${i}`,
      routeTraceId: `rt-${i}`,
      freshnessState: 'F4_UNUSABLE',
      lineageComplete: false,
      fieldFamily: `family.${i}`,
    })),
    { requestedFieldFamilies: Array.from({ length: 10 }, (_, i) => `family.${i}`) },
  );
  const result = compileBlindSpots(massiveInput);
  const prop = propagateBlindSpots(result.blindSpots, result.summary);
  assert(prop.confidenceHaircut <= 1.0, 'Haircut does not exceed 1.0');
});

// ── E. ANTI-FAKE: PROPAGATION HONESTY ───────────────────────────────────────

group('36. Propagation honesty: no violations for correct propagation', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome({ routeState: 'R2_DEGRADED' })],
    [makeEnvelopeOutcome({ freshnessState: 'F4_UNUSABLE' })],
  ));
  const prop = propagateBlindSpots(result.blindSpots, result.summary);
  const violations = verifyPropagationHonesty(result.blindSpots, prop);
  assert(violations.length === 0, `No violations, got: ${violations.join('; ')}`);
});

group('37. Propagation honesty: detects missing audit log', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome({ routeState: 'R2_DEGRADED' })],
    [makeEnvelopeOutcome()],
  ));
  const prop = propagateBlindSpots(result.blindSpots, result.summary);
  const tamperedEffects = prop.effects.filter(e => e.target !== 'AUDIT_LOG');
  const violations = verifyPropagationHonesty(result.blindSpots, {
    ...prop,
    effects: tamperedEffects,
  });
  assert(violations.some(v => v.includes('audit log')), 'Detects missing audit log entry');
});

group('38. Propagation honesty: detects missing UI badge for disclosure', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [],
    [makeEnvelopeOutcome({ freshnessState: 'F4_UNUSABLE' })],
  ));
  const prop = propagateBlindSpots(result.blindSpots, result.summary);
  const tamperedEffects = prop.effects.filter(
    e => !(e.target === 'UI_BADGES' && e.blindSpotId !== '__aggregate__'));
  const violations = verifyPropagationHonesty(result.blindSpots, {
    ...prop,
    effects: tamperedEffects,
  });
  assert(violations.some(v => v.includes('UI badge')), 'Detects missing UI badge for disclosure');
});

group('39. Propagation honesty: detects missing lineage augmentation', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome({ routeState: 'R2_DEGRADED' })],
    [makeEnvelopeOutcome()],
  ));
  const prop = propagateBlindSpots(result.blindSpots, result.summary);
  const violations = verifyPropagationHonesty(result.blindSpots, {
    ...prop,
    lineageAugmentation: { ...prop.lineageAugmentation, activeBlindSpotIds: [] },
  });
  assert(violations.some(v => v.includes('lineage augmentation')), 'Detects missing lineage augmentation');
});

// ── F. INGRESS HONESTY INVARIANT ────────────────────────────────────────────

group('40. Semantic-loss fallback always produces disclosure', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome({
      fallbackUsed: true,
      fallbackInput: makeFallbackInput(),
    })],
    [makeEnvelopeOutcome()],
  ));
  const semanticLossSpots = result.blindSpots.filter(
    bs => bs.type === 'FALLBACK_WITH_SEMANTIC_LOSS');
  for (const bs of semanticLossSpots) {
    assert(bs.disclosureRequired, `Semantic-loss blind spot ${bs.blindSpotId} requires disclosure`);
    assert(bs.disclosureText.length > 0, `Semantic-loss blind spot ${bs.blindSpotId} has disclosure text`);
  }
  const prop = propagateBlindSpots(result.blindSpots, result.summary);
  const violations = verifyPropagationHonesty(result.blindSpots, prop);
  assert(violations.length === 0, 'No propagation honesty violations for semantic-loss fallback');
});

group('41. Every blind spot has a valid fingerprint', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome({ routeState: 'R3_PARTIAL' })],
    [makeEnvelopeOutcome({ freshnessState: 'F4_UNUSABLE', lineageComplete: false })],
  ));
  for (const bs of result.blindSpots) {
    assert(bs.fingerprint.startsWith('bsfp-'), `Blind spot ${bs.blindSpotId} has valid fingerprint`);
    assert(bs.fingerprint.length > 5, `Blind spot ${bs.blindSpotId} fingerprint is non-trivial`);
  }
});

group('42. No blind spot without at least one reason code', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome({
      routeState: 'R2_DEGRADED',
      fallbackUsed: true,
      fallbackInput: makeFallbackInput(),
    })],
    [makeEnvelopeOutcome({ freshnessState: 'F4_UNUSABLE', lineageComplete: false })],
  ));
  for (const bs of result.blindSpots) {
    assert(bs.reasonCodes.length > 0, `Blind spot ${bs.blindSpotId} has reason codes`);
  }
});

group('43. CRITICAL blind spot always has claim constraints', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome()],
    [makeEnvelopeOutcome({ freshnessState: 'F4_UNUSABLE' })],
  ));
  const critical = result.blindSpots.filter(bs => bs.severity === 'CRITICAL');
  for (const bs of critical) {
    assert(bs.claimConstraints.length > 0,
      `CRITICAL blind spot ${bs.blindSpotId} has claim constraints`);
  }
});

group('44. Combined multi-weakness request compiles fully', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [
      makeRouteOutcome({
        routeTraceId: 'rt-1',
        routeState: 'R2_DEGRADED',
        routeProbationState: 'RECOVERING_PROBATION',
        fallbackUsed: true,
        fallbackInput: makeFallbackInput({
          originalRouteId: 'route-orig-1',
          fallbackRouteId: 'route-fb-1',
        }),
      }),
    ],
    [
      makeEnvelopeOutcome({
        envelopeTraceId: 'et-1',
        freshnessState: 'F3_STALE_AND_CONSTRAINED',
        lineageComplete: false,
        canonicalResolutionState: 'unresolved',
      }),
    ],
    { requestedFieldFamilies: ['derivatives.funding', 'protocol.tvl'] },
  ));

  assert(result.blindSpots.length >= 4, `At least 4 blind spots for multi-weakness request, got ${result.blindSpots.length}`);
  assert(result.fallbackSemantics.length === 1, 'Fallback semantics recorded');
  assert(result.summary.critical >= 1, 'Critical spots present');
  assert(result.summary.high >= 1, 'High spots present');

  recordBlindSpots(result.blindSpots);
  const prop = propagateBlindSpots(result.blindSpots, result.summary);
  assert(prop.confidenceHaircut > 0, 'Confidence haircut applied');
  assert(prop.lineageAugmentation.activeBlindSpotIds.length === result.blindSpots.length,
    'All blind spots in lineage augmentation');
  assert(prop.lineageAugmentation.disclosureSummaries.length >= 1, 'Disclosures present');

  const violations = verifyPropagationHonesty(result.blindSpots, prop);
  assert(violations.length === 0, `No propagation honesty violations, got: ${violations.join('; ')}`);
});

group('45. Chat system receives disclosure for visible blind spots', () => {
  resetAll();
  const result = compileBlindSpots(makeEngineInput(
    [makeRouteOutcome({
      fallbackUsed: true,
      fallbackInput: makeFallbackInput({
        fallbackRouteMode: 'BACKFILL',
      }),
    })],
    [makeEnvelopeOutcome()],
  ));
  const prop = propagateBlindSpots(result.blindSpots, result.summary);
  assert(prop.effects.some(e => e.target === 'CHAT_SYSTEM' && e.effectType === 'DISPLAY_CAVEAT'),
    'Chat system receives display caveat');
});

// ═══════════════════════════════════════════════════════════════════════════════
// FINAL REPORT
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(68));
if (failed === 0) {
  console.log(`✅ ALL ${passed} ASSERTIONS PASSED — L2.7 constitutionally verified`);
} else {
  console.log(`❌ ${failed} FAILED out of ${passed + failed}`);
  console.log('Failures:');
  for (const f of failures) console.log(`  - ${f}`);
}
console.log('═'.repeat(68));

process.exit(failed > 0 ? 1 : 0);
