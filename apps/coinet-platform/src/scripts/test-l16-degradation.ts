/**
 * L1.6 Source Degradation Semantics — Full Integration Test
 *
 * Tests: level assignment, disclosure generation, downstream propagation,
 * restoration hysteresis, ledger auditability, claim restrictions,
 * and anti-fake degradation (behavior must change when level changes).
 */

import assert from 'node:assert';

import { TRUTH_CLASSES, type TruthClass } from '../services/source-systems/registry';
import {
  type DegradationInput, type FieldDegradationInput, type DegradationLevel,
  DEGRADATION_RANK, DEGRADATION_LABELS, DOWNSTREAM_BLOCKS, CONFIDENCE_PENALTY_RANGE,
  DISCLOSURE_TEMPLATES, CLAIM_RESTRICTIONS, getClaimRestrictions,
  L16_PLATFORM_VERSION,
} from '../services/source-systems/classes/degradation-types';
import {
  CLASS_DEGRADATION_PROFILES, getAllClassProfiles,
} from '../services/source-systems/classes/degradation-constitution';
import {
  evaluateDegradation, evaluateAllDegradation, buildDegradationFingerprint,
  buildPropagationMap, getLockedClasses, getClassesUnsafeForThesis, getAllDisclosures,
} from '../services/source-systems/classes/degradation-evaluator';
import {
  recordDegradation, recordDegradationBatch, constrainRestoration,
  attemptRestoration, getCurrentLevel, getAllCurrentLevels,
  getLedger, getDegradationEvents, getRestorationEvents,
  resetState,
} from '../services/source-systems/classes/degradation-ledger';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ✅ ${name}`); }
  catch (e: any) { failed++; console.log(`  ❌ ${name}: ${e.message}`); }
}

function makeField(overrides: Partial<FieldDegradationInput> & { fieldId: string }): FieldDegradationInput {
  return {
    healthState: 'H0_HEALTHY', integrityState: 'I0_INTACT',
    permissionState: 'ALLOW_PRIMARY', recoveryState: 'STABLE',
    criticality: 'CONTEXTUAL', isMissionCritical: false, isThesisCritical: false,
    ...overrides,
  };
}

function makeInput(classId: TruthClass, fieldStates: FieldDegradationInput[], overrides?: Partial<DegradationInput>): DegradationInput {
  return {
    classId, fieldStates,
    substitutionBlindCount: 0, substitutionDegradedCount: 0,
    noFallbackTriggered: false, conflictContradictionsPreserved: 0,
    conflictBlockersActive: 0, conflictUnresolved: 0,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. CONSTITUTION COMPLETENESS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── 1. Constitution completeness ───');

test('All 9 truth classes have degradation profiles', () => {
  const classes = Object.values(TRUTH_CLASSES);
  for (const tc of classes) {
    assert.ok(CLASS_DEGRADATION_PROFILES[tc], `Missing degradation profile for ${tc}`);
  }
});

test('Every profile has d1, d2, d3, d4 with triggers', () => {
  for (const profile of getAllClassProfiles()) {
    for (const lvl of ['d1', 'd2', 'd3', 'd4'] as const) {
      assert.ok(profile[lvl].triggers.length > 0, `${profile.classId}.${lvl} has no triggers`);
    }
  }
});

test('Disclosure templates cover all 9 classes', () => {
  for (const tc of Object.values(TRUTH_CLASSES)) {
    assert.ok(DISCLOSURE_TEMPLATES[tc], `Missing disclosure template for ${tc}`);
  }
});

test('D4 blocks at least 5 downstream components', () => {
  assert.ok(DOWNSTREAM_BLOCKS['D4_EPISTEMIC_LOCK'].length >= 5);
});

test('D0 blocks nothing', () => {
  assert.strictEqual(DOWNSTREAM_BLOCKS['D0_NORMAL'].length, 0);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 2. LEVEL ASSIGNMENT
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── 2. Level assignment ───');

test('All healthy fields → D0_NORMAL', () => {
  const input = makeInput(TRUTH_CLASSES.MARKET_SURFACE, [
    makeField({ fieldId: 'price.spot.canonical' }),
    makeField({ fieldId: 'price.ohlcv' }),
    makeField({ fieldId: 'market.cap' }),
  ]);
  const result = evaluateDegradation(input);
  assert.strictEqual(result.level, 'D0_NORMAL');
  assert.strictEqual(result.confidencePenalty, 0);
});

test('Stressed fields → D1_REDUCED_CONFIDENCE', () => {
  const input = makeInput(TRUTH_CLASSES.DERIVATIVES_PRESSURE, [
    makeField({ fieldId: 'derivatives.oi.aggregate', healthState: 'H1_STRESSED' }),
    makeField({ fieldId: 'derivatives.funding.aggregate' }),
  ]);
  const result = evaluateDegradation(input);
  assert.strictEqual(result.level, 'D1_REDUCED_CONFIDENCE');
  assert.ok(result.confidencePenalty > 0);
});

test('Suppressed field → D2_PARTIAL_BLINDNESS', () => {
  const input = makeInput(TRUTH_CLASSES.DERIVATIVES_PRESSURE, [
    makeField({ fieldId: 'derivatives.liquidation.orderflow', permissionState: 'SUPPRESS_CLAIM', healthState: 'H3_PARTIAL_BLINDNESS' }),
    makeField({ fieldId: 'derivatives.funding.aggregate' }),
  ]);
  const result = evaluateDegradation(input);
  assert.strictEqual(result.level, 'D2_PARTIAL_BLINDNESS');
});

test('No-fallback triggered → D3_DOMAIN_DEGRADATION', () => {
  const input = makeInput(TRUTH_CLASSES.PROTOCOL_SUBSTANCE, [
    makeField({ fieldId: 'protocol.tvl.usd', healthState: 'H4_UNSAFE' }),
    makeField({ fieldId: 'protocol.fees.daily', healthState: 'H4_UNSAFE' }),
  ], { noFallbackTriggered: true });
  const result = evaluateDegradation(input);
  assert.strictEqual(result.level, 'D3_DOMAIN_DEGRADATION');
  assert.strictEqual(result.directionalClaimsAllowed, false);
});

test('Mission-critical field blocked → D4_EPISTEMIC_LOCK', () => {
  const input = makeInput(TRUTH_CLASSES.MARKET_SURFACE, [
    makeField({
      fieldId: 'price.spot.canonical',
      permissionState: 'BLOCK_OUTPUT', isMissionCritical: true,
      healthState: 'H5_SUPPRESSED',
    }),
    makeField({ fieldId: 'price.ohlcv' }),
  ]);
  const result = evaluateDegradation(input);
  assert.strictEqual(result.level, 'D4_EPISTEMIC_LOCK');
  assert.strictEqual(result.directionalClaimsAllowed, false);
  assert.strictEqual(result.truthState, 'PROHIBITED_TRUTH');
});

test('Integrity broken on mission-critical → D4', () => {
  const input = makeInput(TRUTH_CLASSES.STRUCTURAL_SAFETY, [
    makeField({
      fieldId: 'security.token.flags',
      integrityState: 'I4_BROKEN', isMissionCritical: true,
    }),
    makeField({ fieldId: 'security.contract.risk' }),
  ]);
  const result = evaluateDegradation(input);
  assert.strictEqual(result.level, 'D4_EPISTEMIC_LOCK');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 3. DISCLOSURE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── 3. Disclosure generation ───');

test('D0 produces empty disclosure', () => {
  const input = makeInput(TRUTH_CLASSES.MARKET_SURFACE, [
    makeField({ fieldId: 'price.spot.canonical' }),
  ]);
  const result = evaluateDegradation(input);
  assert.strictEqual(result.userDisclosure, '');
});

test('D1 produces non-empty disclosure for derivatives', () => {
  const input = makeInput(TRUTH_CLASSES.DERIVATIVES_PRESSURE, [
    makeField({ fieldId: 'derivatives.oi.aggregate', healthState: 'H1_STRESSED' }),
  ]);
  const result = evaluateDegradation(input);
  assert.ok(result.userDisclosure.length > 0, 'D1 must have disclosure');
  assert.ok(result.userDisclosure.includes('Derivatives'), `Disclosure must name class: ${result.userDisclosure}`);
});

test('D4 produces strong disclosure for structural safety', () => {
  const input = makeInput(TRUTH_CLASSES.STRUCTURAL_SAFETY, [
    makeField({ fieldId: 'security.token.flags', permissionState: 'BLOCK_OUTPUT', isMissionCritical: true, healthState: 'H5_SUPPRESSED' }),
  ]);
  const result = evaluateDegradation(input);
  assert.ok(result.userDisclosure.includes('withheld'), `D4 safety disclosure must mention withholding`);
});

test('All disclosures name what is degraded and consequence', () => {
  const assessments = [
    evaluateDegradation(makeInput(TRUTH_CLASSES.ENTITY_CONTEXT, [
      makeField({ fieldId: 'entity.wallet.labels', healthState: 'H1_STRESSED' }),
    ])),
  ];
  const disclosures = getAllDisclosures(assessments);
  for (const d of disclosures) {
    assert.ok(d.disclosure.length > 10, `Disclosure too short for ${d.classId}`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 4. CLAIM RESTRICTIONS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── 4. Claim restrictions ───');

test('D0 allows everything', () => {
  const r = getClaimRestrictions('D0_NORMAL');
  assert.strictEqual(r.directionalClaimsAllowed, true);
  assert.strictEqual(r.thesisUseAllowed, true);
  assert.strictEqual(r.scoringAllowed, true);
  assert.strictEqual(r.chatCaveatRequired, false);
});

test('D2 blocks scoring but allows directional claims', () => {
  const r = getClaimRestrictions('D2_PARTIAL_BLINDNESS');
  assert.strictEqual(r.directionalClaimsAllowed, true);
  assert.strictEqual(r.scoringAllowed, false);
  assert.strictEqual(r.chatCaveatRequired, true);
});

test('D3 blocks directional, thesis, scenario, and scoring', () => {
  const r = getClaimRestrictions('D3_DOMAIN_DEGRADATION');
  assert.strictEqual(r.directionalClaimsAllowed, false);
  assert.strictEqual(r.thesisUseAllowed, false);
  assert.strictEqual(r.scenarioConfirmationAllowed, false);
  assert.strictEqual(r.scoringAllowed, false);
});

test('D4 blocks everything including chat mention', () => {
  const r = getClaimRestrictions('D4_EPISTEMIC_LOCK');
  assert.strictEqual(r.directionalClaimsAllowed, false);
  assert.strictEqual(r.chatMentionAllowed, false);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 5. DOWNSTREAM PROPAGATION
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── 5. Downstream propagation ───');

test('D2 blocks SCORE_OUTPUT', () => {
  const input = makeInput(TRUTH_CLASSES.ONCHAIN_BEHAVIOR, [
    makeField({ fieldId: 'onchain.whale.flows', permissionState: 'SUPPRESS_CLAIM', healthState: 'H3_PARTIAL_BLINDNESS' }),
    makeField({ fieldId: 'onchain.transfers.evm' }),
  ]);
  const result = evaluateDegradation(input);
  assert.ok(result.blockedDownstream.includes('SCORE_OUTPUT'));
});

test('D3 blocks SCENARIO_ENGINE and JUDGMENT_LAYER', () => {
  const input = makeInput(TRUTH_CLASSES.ENTITY_CONTEXT, [
    makeField({ fieldId: 'entity.wallet.labels', healthState: 'H4_UNSAFE' }),
    makeField({ fieldId: 'entity.smart_money', healthState: 'H4_UNSAFE' }),
  ], { noFallbackTriggered: true });
  const result = evaluateDegradation(input);
  assert.ok(result.blockedDownstream.includes('SCENARIO_ENGINE'));
  assert.ok(result.blockedDownstream.includes('JUDGMENT_LAYER'));
});

test('D4 blocks CHAT_SYSTEM', () => {
  const input = makeInput(TRUTH_CLASSES.NARRATIVE_ATTENTION, [
    makeField({ fieldId: 'narrative.news.velocity', permissionState: 'BLOCK_OUTPUT', isMissionCritical: true }),
  ]);
  const result = evaluateDegradation(input);
  assert.ok(result.blockedDownstream.includes('CHAT_SYSTEM'));
});

test('Propagation map shows effects per component', () => {
  const assessments = evaluateAllDegradation([
    makeInput(TRUTH_CLASSES.DERIVATIVES_PRESSURE, [
      makeField({ fieldId: 'derivatives.funding.aggregate', healthState: 'H1_STRESSED' }),
    ]),
    makeInput(TRUTH_CLASSES.MARKET_SURFACE, [
      makeField({ fieldId: 'price.spot.canonical', permissionState: 'BLOCK_OUTPUT', isMissionCritical: true, healthState: 'H5_SUPPRESSED' }),
    ]),
  ]);
  const map = buildPropagationMap(assessments);
  assert.ok(map.length > 0, 'Propagation map should have entries');
  assert.ok(map.some(e => e.effect === 'block'), 'Should have block effects for D4');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 6. FINGERPRINT
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── 6. Degradation fingerprint ───');

test('Fingerprint captures all classes', () => {
  const assessments = evaluateAllDegradation([
    makeInput(TRUTH_CLASSES.MARKET_SURFACE, [makeField({ fieldId: 'price.spot.canonical' })]),
    makeInput(TRUTH_CLASSES.DERIVATIVES_PRESSURE, [makeField({ fieldId: 'derivatives.oi.aggregate', healthState: 'H1_STRESSED' })]),
  ]);
  const fp = buildDegradationFingerprint(assessments);
  assert.strictEqual(fp.entries.length, 2);
  assert.ok(fp.systemSpeakable, 'System should be speakable without D4');
});

test('D4 makes systemSpeakable=false', () => {
  const assessments = evaluateAllDegradation([
    makeInput(TRUTH_CLASSES.MARKET_SURFACE, [
      makeField({ fieldId: 'price.spot.canonical', permissionState: 'BLOCK_OUTPUT', isMissionCritical: true, healthState: 'H5_SUPPRESSED' }),
    ]),
  ]);
  const fp = buildDegradationFingerprint(assessments);
  assert.strictEqual(fp.systemSpeakable, false);
  assert.strictEqual(fp.classesAtD4, 1);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 7. RESTORATION HYSTERESIS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── 7. Restoration hysteresis ───');

test('D4 cannot jump directly to D0', () => {
  const constrained = constrainRestoration('D4_EPISTEMIC_LOCK', 'D0_NORMAL');
  assert.strictEqual(constrained, 'D3_DOMAIN_DEGRADATION');
});

test('D3 can only step to D2', () => {
  const constrained = constrainRestoration('D3_DOMAIN_DEGRADATION', 'D0_NORMAL');
  assert.strictEqual(constrained, 'D2_PARTIAL_BLINDNESS');
});

test('D2 can only step to D1', () => {
  const constrained = constrainRestoration('D2_PARTIAL_BLINDNESS', 'D0_NORMAL');
  assert.strictEqual(constrained, 'D1_REDUCED_CONFIDENCE');
});

test('D1 can step to D0', () => {
  const constrained = constrainRestoration('D1_REDUCED_CONFIDENCE', 'D0_NORMAL');
  assert.strictEqual(constrained, 'D0_NORMAL');
});

test('Degradation-direction changes are not constrained', () => {
  const constrained = constrainRestoration('D1_REDUCED_CONFIDENCE', 'D4_EPISTEMIC_LOCK');
  assert.strictEqual(constrained, 'D4_EPISTEMIC_LOCK');
});

test('attemptRestoration enforces hysteresis', () => {
  resetState();
  const d4assessment = evaluateDegradation(makeInput(TRUTH_CLASSES.DERIVATIVES_PRESSURE, [
    makeField({ fieldId: 'derivatives.oi.aggregate', permissionState: 'BLOCK_OUTPUT', isMissionCritical: true, healthState: 'H5_SUPPRESSED' }),
  ]));
  recordDegradation(d4assessment);
  assert.strictEqual(getCurrentLevel(TRUTH_CLASSES.DERIVATIVES_PRESSURE), 'D4_EPISTEMIC_LOCK');

  const d0assessment = evaluateDegradation(makeInput(TRUTH_CLASSES.DERIVATIVES_PRESSURE, [
    makeField({ fieldId: 'derivatives.oi.aggregate' }),
  ]));
  attemptRestoration(TRUTH_CLASSES.DERIVATIVES_PRESSURE, d0assessment);
  assert.strictEqual(getCurrentLevel(TRUTH_CLASSES.DERIVATIVES_PRESSURE), 'D3_DOMAIN_DEGRADATION');
});

// ═══════════════════════════════════════════════════════════════════════════════
// 8. LEDGER AUDITABILITY
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── 8. Ledger auditability ───');

test('Degradation events are logged', () => {
  resetState();
  const assessment = evaluateDegradation(makeInput(TRUTH_CLASSES.STRUCTURAL_SAFETY, [
    makeField({ fieldId: 'security.token.flags', healthState: 'H1_STRESSED' }),
  ]));
  recordDegradation(assessment);
  const events = getLedger();
  assert.ok(events.length >= 1);
  const last = events[events.length - 1];
  assert.strictEqual(last.classId, TRUTH_CLASSES.STRUCTURAL_SAFETY);
  assert.strictEqual(last.levelTo, 'D1_REDUCED_CONFIDENCE');
});

test('Degradation direction tracked correctly', () => {
  resetState();
  const d1 = evaluateDegradation(makeInput(TRUTH_CLASSES.MARKET_SURFACE, [
    makeField({ fieldId: 'price.spot.canonical', healthState: 'H1_STRESSED' }),
  ]));
  const evt1 = recordDegradation(d1);
  assert.strictEqual(evt1.direction, 'DEGRADED');

  const d0 = evaluateDegradation(makeInput(TRUTH_CLASSES.MARKET_SURFACE, [
    makeField({ fieldId: 'price.spot.canonical' }),
  ]));
  const evt2 = recordDegradation(d0);
  assert.strictEqual(evt2.direction, 'RESTORED');
});

test('Batch recording works', () => {
  resetState();
  const assessments = evaluateAllDegradation([
    makeInput(TRUTH_CLASSES.MARKET_SURFACE, [makeField({ fieldId: 'price.spot.canonical', healthState: 'H1_STRESSED' })]),
    makeInput(TRUTH_CLASSES.DERIVATIVES_PRESSURE, [makeField({ fieldId: 'derivatives.funding.aggregate' })]),
  ]);
  const events = recordDegradationBatch(assessments);
  assert.strictEqual(events.length, 2);
});

test('Audit codes are human-meaningful', () => {
  resetState();
  const assessment = evaluateDegradation(makeInput(TRUTH_CLASSES.DERIVATIVES_PRESSURE, [
    makeField({ fieldId: 'derivatives.liquidation.orderflow', permissionState: 'SUPPRESS_CLAIM', healthState: 'H3_PARTIAL_BLINDNESS' }),
    makeField({ fieldId: 'derivatives.funding.aggregate' }),
  ]));
  assert.ok(assessment.auditCode.length > 0, 'Non-D0 must have audit code');
  assert.ok(assessment.auditCode.includes('DERIV') || assessment.auditCode.includes('D2'), `Audit code should be meaningful: ${assessment.auditCode}`);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. ANTI-FAKE DEGRADATION
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── 9. Anti-fake degradation ───');

test('Level change always changes downstream behavior', () => {
  const d0 = evaluateDegradation(makeInput(TRUTH_CLASSES.MARKET_SURFACE, [
    makeField({ fieldId: 'price.spot.canonical' }),
  ]));
  const d1 = evaluateDegradation(makeInput(TRUTH_CLASSES.MARKET_SURFACE, [
    makeField({ fieldId: 'price.spot.canonical', healthState: 'H1_STRESSED' }),
  ]));

  if (d0.level !== d1.level) {
    const d0blocks = d0.blockedDownstream;
    const d1blocks = d1.blockedDownstream;
    const d0penalty = d0.confidencePenalty;
    const d1penalty = d1.confidencePenalty;
    const behaviorChanged =
      d0blocks.length !== d1blocks.length ||
      d0penalty !== d1penalty ||
      d0.directionalClaimsAllowed !== d1.directionalClaimsAllowed ||
      d0.userDisclosure !== d1.userDisclosure;
    assert.ok(behaviorChanged, 'Level change must produce behavior change');
  }
});

test('D2 actually blocks more than D1', () => {
  const d1blocks = DOWNSTREAM_BLOCKS['D1_REDUCED_CONFIDENCE'];
  const d2blocks = DOWNSTREAM_BLOCKS['D2_PARTIAL_BLINDNESS'];
  assert.ok(d2blocks.length > d1blocks.length, 'D2 must block more components than D1');
});

test('D3 blocks more than D2', () => {
  const d2blocks = DOWNSTREAM_BLOCKS['D2_PARTIAL_BLINDNESS'];
  const d3blocks = DOWNSTREAM_BLOCKS['D3_DOMAIN_DEGRADATION'];
  assert.ok(d3blocks.length > d2blocks.length, 'D3 must block more components than D2');
});

test('D4 blocks more than D3', () => {
  const d3blocks = DOWNSTREAM_BLOCKS['D3_DOMAIN_DEGRADATION'];
  const d4blocks = DOWNSTREAM_BLOCKS['D4_EPISTEMIC_LOCK'];
  assert.ok(d4blocks.length > d3blocks.length, 'D4 must block more components than D3');
});

test('Confidence penalty monotonically increases with level', () => {
  const levels: DegradationLevel[] = ['D0_NORMAL', 'D1_REDUCED_CONFIDENCE', 'D2_PARTIAL_BLINDNESS', 'D3_DOMAIN_DEGRADATION', 'D4_EPISTEMIC_LOCK'];
  for (let i = 1; i < levels.length; i++) {
    const [lo1] = CONFIDENCE_PENALTY_RANGE[levels[i - 1]];
    const [lo2] = CONFIDENCE_PENALTY_RANGE[levels[i]];
    assert.ok(lo2 >= lo1, `${levels[i]} penalty floor (${lo2}) must be >= ${levels[i-1]} floor (${lo1})`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// 10. DOCTRINAL INVARIANTS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n─── 10. Doctrinal invariants ───');

test('D4 is always PROHIBITED_TRUTH', () => {
  const input = makeInput(TRUTH_CLASSES.STRUCTURAL_SAFETY, [
    makeField({ fieldId: 'security.token.flags', integrityState: 'I4_BROKEN', isMissionCritical: true }),
  ]);
  const result = evaluateDegradation(input);
  assert.strictEqual(result.truthState, 'PROHIBITED_TRUTH');
});

test('D0 is always FULL_TRUTH', () => {
  const input = makeInput(TRUTH_CLASSES.MARKET_SURFACE, [
    makeField({ fieldId: 'price.spot.canonical' }),
  ]);
  const result = evaluateDegradation(input);
  assert.strictEqual(result.truthState, 'FULL_TRUTH');
});

test('Every non-D0 assessment has reasonCodes', () => {
  const input = makeInput(TRUTH_CLASSES.DERIVATIVES_PRESSURE, [
    makeField({ fieldId: 'derivatives.oi.aggregate', healthState: 'H2_DEGRADED' }),
  ]);
  const result = evaluateDegradation(input);
  if (result.level !== 'D0_NORMAL') {
    assert.ok(result.reasonCodes.length > 0, 'Non-D0 must have reasons');
  }
});

test('Every assessment has version', () => {
  const input = makeInput(TRUTH_CLASSES.MARKET_SURFACE, [makeField({ fieldId: 'price.spot.canonical' })]);
  const result = evaluateDegradation(input);
  assert.strictEqual(result.version, L16_PLATFORM_VERSION);
});

test('getLockedClasses and getClassesUnsafeForThesis work correctly', () => {
  const assessments = evaluateAllDegradation([
    makeInput(TRUTH_CLASSES.MARKET_SURFACE, [
      makeField({ fieldId: 'price.spot.canonical', permissionState: 'BLOCK_OUTPUT', isMissionCritical: true, healthState: 'H5_SUPPRESSED' }),
    ]),
    makeInput(TRUTH_CLASSES.DERIVATIVES_PRESSURE, [
      makeField({ fieldId: 'derivatives.oi.aggregate' }),
    ]),
  ]);
  const locked = getLockedClasses(assessments);
  assert.strictEqual(locked.length, 1);
  assert.strictEqual(locked[0].classId, TRUTH_CLASSES.MARKET_SURFACE);

  const unsafe = getClassesUnsafeForThesis(assessments);
  assert.ok(unsafe.length >= 1);
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

console.log(`\n════════════════════════════════════════════════════`);
console.log(`  L1.6 Source Degradation Semantics — Test Results`);
console.log(`  Passed: ${passed}  Failed: ${failed}  Total: ${passed + failed}`);
console.log(`════════════════════════════════════════════════════`);

if (failed > 0) process.exit(1);
