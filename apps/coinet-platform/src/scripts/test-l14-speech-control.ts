/**
 * L1.4.1 Speech Control Layer — Integration Test
 *
 * Tests the upgrade from "health monitor" to "constitutional speech-control":
 *   - Epistemic integrity (same truth vs different truth)
 *   - Claim permission compiler (deterministic speakability decisions)
 *   - Field criticality (blast radius, suppression aggressiveness)
 *   - Recovery governor (probation, hysteresis, trust haircut)
 */

import { strict as assert } from 'assert';
import { recordSuccess, recordFailure, resetAllHealth, getProviderHealth } from '../services/source-systems/health-monitor';
import {
  evaluateFieldIntegrity, isSameTruthType, evaluateBaselineIntegrity,
  getBrokenIntegrityFields, getFieldTuple, FIELD_TUPLES,
  type ObservedFieldMetadata,
} from '../services/source-systems/classes/epistemic-integrity-engine';
import {
  compilePermission, compileAllPermissions, getSuppressedFields,
  getDisclosureRequiredFields, getSpeakabilityReport,
} from '../services/source-systems/classes/claim-permission-compiler';
import {
  FIELD_CRITICALITY_MAP, getFieldCriticality, getFieldsByCriticality,
  getMissionCriticalFields, getBlastRadius, getFieldsAffectedByLoss,
} from '../services/source-systems/classes/field-criticality-map';
import {
  recordIncident, recordCleanWindow, recordRecoveryFailure,
  getRecoveryState, isInRecovery, getRecoveryTrustHaircut,
  getProvidersInRecovery, resetAllRecoveryStates,
} from '../services/source-systems/classes/recovery-governor';
import { FIELD_AUTHORITY_MAP } from '../services/source-systems/classes/authority-constitution';
import {
  INTEGRITY_STATE_LABELS, CLAIM_PERMISSION_LABELS, CLAIM_PERMISSION_SPEAKABLE,
  RECOVERY_STATE_LABELS, RECOVERY_TRUST_HAIRCUT, CRITICALITY_SUPPRESSION_WEIGHT,
  type IntegrityState, type ClaimPermission, type RecoveryState, type FieldCriticality,
} from '../services/source-systems/classes/health-types';

let passed = 0;
let total = 0;

function test(name: string, fn: () => void): void {
  total++;
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e: any) {
    console.log(`  ❌ ${name}: ${e.message}`);
  }
}

function setup(): void {
  resetAllHealth();
  resetAllRecoveryStates();
}

console.log('\n═══════════════════════════════════════════════════');
console.log(' L1.4.1 SPEECH CONTROL LAYER — TESTS');
console.log('═══════════════════════════════════════════════════\n');

// ── Group 1: Representative field tuples ───────────────────────────────────
console.log('▸ Group 1: Representative field tuples');

test('Every FIELD_AUTHORITY_MAP field has a representative tuple', () => {
  const fields = Object.keys(FIELD_AUTHORITY_MAP);
  for (const f of fields) {
    assert.ok(FIELD_TUPLES[f], `Missing tuple for ${f}`);
  }
});

test('Tuples have required fields: unit, methodologyId, scopeDescription', () => {
  for (const [id, tuple] of Object.entries(FIELD_TUPLES)) {
    assert.ok(tuple.unit, `${id} missing unit`);
    assert.ok(tuple.methodologyId, `${id} missing methodologyId`);
    assert.ok(tuple.scopeDescription, `${id} missing scopeDescription`);
  }
});

test('Derivatives tuples have venueScope multi_exchange_basket', () => {
  const derivFields = ['derivatives.oi.aggregate', 'derivatives.funding.aggregate', 'derivatives.liquidation.orderflow'];
  for (const f of derivFields) {
    assert.strictEqual(FIELD_TUPLES[f].venueScope, 'multi_exchange_basket');
  }
});

// ── Group 2: Integrity evaluation — intact ─────────────────────────────────
console.log('\n▸ Group 2: Integrity evaluation — intact');

test('Observation matching tuple exactly → I0_INTACT', () => {
  const tuple = getFieldTuple('price.spot.canonical')!;
  const record = evaluateFieldIntegrity({
    fieldId: 'price.spot.canonical', providerId: 'coingecko',
    unit: tuple.unit, quoteBasis: tuple.quoteBasis,
    venueScope: tuple.venueScope, timeBasis: tuple.timeBasis,
    methodologyId: tuple.methodologyId,
  });
  assert.strictEqual(record.state, 'I0_INTACT');
  assert.strictEqual(record.brokenDimensions.length, 0);
  assert.strictEqual(record.integrityScore, 1);
});

test('Baseline integrity for all fields → all I0_INTACT', () => {
  const baseline = evaluateBaselineIntegrity();
  assert.ok(baseline.length > 0);
  for (const r of baseline) {
    assert.strictEqual(r.state, 'I0_INTACT', `${r.fieldId} baseline should be I0_INTACT, got ${r.state}`);
  }
});

test('isSameTruthType returns true for intact observation', () => {
  const tuple = getFieldTuple('derivatives.oi.aggregate')!;
  assert.ok(isSameTruthType({
    fieldId: 'derivatives.oi.aggregate', providerId: 'coinglass',
    unit: tuple.unit, venueScope: tuple.venueScope,
    timeBasis: tuple.timeBasis, methodologyId: tuple.methodologyId,
  }));
});

// ── Group 3: Integrity evaluation — broken ─────────────────────────────────
console.log('\n▸ Group 3: Integrity evaluation — broken');

test('Unit changed → I3 or I4 (different truth type)', () => {
  const record = evaluateFieldIntegrity({
    fieldId: 'price.spot.canonical', providerId: 'coingecko',
    unit: 'BTC', quoteBasis: 'BTC', venueScope: 'exchange_aggregate',
    timeBasis: 'spot', methodologyId: 'volume_weighted_aggregate',
  });
  assert.ok(record.state === 'I3_MATERIAL_MISMATCH' || record.state === 'I4_BROKEN', `Got: ${record.state}`);
  assert.ok(record.brokenDimensions.includes('unit'));
  assert.ok(record.brokenDimensions.includes('quoteBasis'));
});

test('Methodology changed → material mismatch or broken', () => {
  const record = evaluateFieldIntegrity({
    fieldId: 'derivatives.funding.aggregate', providerId: 'coinglass',
    unit: 'rate_bps', venueScope: 'multi_exchange_basket',
    timeBasis: 'interval_1h', methodologyId: 'simple_average_funding',
  });
  assert.ok(record.state === 'I3_MATERIAL_MISMATCH' || record.state === 'I4_BROKEN');
  assert.ok(record.brokenDimensions.includes('methodology'));
});

test('Venue scope changed → material mismatch', () => {
  const record = evaluateFieldIntegrity({
    fieldId: 'derivatives.oi.aggregate', providerId: 'coinglass',
    unit: 'USD', venueScope: 'single_exchange',
    timeBasis: 'snapshot', methodologyId: 'unified_oi_aggregation',
  });
  assert.ok(record.brokenDimensions.includes('venueScope'));
  assert.ok(record.integrityScore < 1);
});

test('Time basis changed (1h → rolling) → integrity degraded', () => {
  const record = evaluateFieldIntegrity({
    fieldId: 'derivatives.funding.aggregate', providerId: 'coinglass',
    unit: 'rate_bps', venueScope: 'multi_exchange_basket',
    timeBasis: 'rolling_8h', methodologyId: 'weighted_funding_rate',
  });
  assert.ok(record.brokenDimensions.includes('timeBasis'));
});

test('isSameTruthType returns false for broken integrity', () => {
  assert.ok(!isSameTruthType({
    fieldId: 'price.spot.canonical', providerId: 'coingecko',
    unit: 'EUR', quoteBasis: 'EUR', venueScope: 'single_exchange',
    timeBasis: 'delayed', methodologyId: 'different_methodology',
  }));
});

test('Unknown field (no tuple) → I5_UNKNOWN', () => {
  const record = evaluateFieldIntegrity({
    fieldId: 'nonexistent.field', providerId: 'coingecko',
  });
  assert.strictEqual(record.state, 'I5_UNKNOWN');
});

test('getBrokenIntegrityFields filters correctly', () => {
  const observations: ObservedFieldMetadata[] = [
    { fieldId: 'price.spot.canonical', providerId: 'coingecko', unit: 'USD', quoteBasis: 'USD', venueScope: 'exchange_aggregate', timeBasis: 'spot', methodologyId: 'volume_weighted_aggregate' },
    { fieldId: 'derivatives.oi.aggregate', providerId: 'coinglass', unit: 'BTC', venueScope: 'single_exchange', timeBasis: 'delayed', methodologyId: 'different' },
  ];
  const broken = getBrokenIntegrityFields(observations);
  assert.ok(broken.length >= 1);
  assert.ok(broken.some(r => r.fieldId === 'derivatives.oi.aggregate'));
});

// ── Group 4: Claim Permission Compiler — constitutional decisions ──────────
console.log('\n▸ Group 4: Claim permission compiler');

test('Healthy intact field → ALLOW_PRIMARY', () => {
  setup();
  for (let i = 0; i < 10; i++) recordSuccess('coingecko', 200);
  const tuple = getFieldTuple('price.spot.canonical')!;
  const decision = compilePermission('price.spot.canonical', {
    fieldId: 'price.spot.canonical', providerId: 'coingecko',
    unit: tuple.unit, quoteBasis: tuple.quoteBasis, venueScope: tuple.venueScope,
    timeBasis: tuple.timeBasis, methodologyId: tuple.methodologyId,
  });
  assert.strictEqual(decision.permissionState, 'ALLOW_PRIMARY');
  assert.ok(decision.speakable);
  assert.strictEqual(decision.confidencePenalty, 0);
  assert.ok(!decision.disclosureRequired);
});

test('Broken integrity on healthy source → BLOCK_OUTPUT', () => {
  setup();
  for (let i = 0; i < 10; i++) recordSuccess('coingecko', 200);
  const decision = compilePermission('price.spot.canonical', {
    fieldId: 'price.spot.canonical', providerId: 'coingecko',
    unit: 'EUR', quoteBasis: 'EUR', venueScope: 'single_exchange',
    timeBasis: 'delayed', methodologyId: 'completely_different',
  });
  assert.strictEqual(decision.permissionState, 'BLOCK_OUTPUT');
  assert.ok(!decision.speakable);
  assert.strictEqual(decision.confidencePenalty, 1);
});

test('Same health score, different integrity → radically different permission', () => {
  setup();
  for (let i = 0; i < 10; i++) recordSuccess('coinglass', 200);

  const tuple = getFieldTuple('derivatives.oi.aggregate')!;
  const intactDecision = compilePermission('derivatives.oi.aggregate', {
    fieldId: 'derivatives.oi.aggregate', providerId: 'coinglass',
    unit: tuple.unit, venueScope: tuple.venueScope,
    timeBasis: tuple.timeBasis, methodologyId: tuple.methodologyId,
  });

  const brokenDecision = compilePermission('derivatives.oi.aggregate', {
    fieldId: 'derivatives.oi.aggregate', providerId: 'coinglass',
    unit: 'BTC', venueScope: 'single_exchange',
    timeBasis: 'delayed', methodologyId: 'different',
  });

  assert.ok(intactDecision.speakable, 'Intact should be speakable');
  assert.ok(!brokenDecision.speakable, 'Broken should NOT be speakable');
  assert.ok(brokenDecision.confidencePenalty > intactDecision.confidencePenalty);
});

test('Dead provider with no substitute → BLOCK_OUTPUT or SUPPRESS_CLAIM', () => {
  setup();
  for (let i = 0; i < 6; i++) recordFailure('coinglass');
  const decision = compilePermission('derivatives.oi.aggregate');
  assert.ok(
    decision.permissionState === 'SUPPRESS_CLAIM' || decision.permissionState === 'BLOCK_OUTPUT',
    `Expected SUPPRESS or BLOCK, got: ${decision.permissionState}`,
  );
  assert.ok(!decision.speakable);
});

test('Material integrity mismatch on MISSION_CRITICAL → SUPPRESS', () => {
  setup();
  for (let i = 0; i < 10; i++) recordSuccess('coingecko', 200);
  const tuple = getFieldTuple('price.spot.canonical')!;
  const decision = compilePermission('price.spot.canonical', {
    fieldId: 'price.spot.canonical', providerId: 'coingecko',
    unit: tuple.unit, quoteBasis: tuple.quoteBasis, venueScope: tuple.venueScope,
    timeBasis: tuple.timeBasis, methodologyId: 'completely_different_methodology',
  });
  assert.strictEqual(decision.integrityState, 'I3_MATERIAL_MISMATCH');
  assert.strictEqual(decision.permissionState, 'SUPPRESS_CLAIM');
  assert.ok(!decision.speakable);
});

test('Material integrity mismatch on ENRICHMENT_ONLY → PARTIAL_VIEW_ONLY', () => {
  setup();
  for (let i = 0; i < 10; i++) recordSuccess('arkham', 200);
  const tuple = getFieldTuple('entity.cluster.attribution')!;
  const decision = compilePermission('entity.cluster.attribution', {
    fieldId: 'entity.cluster.attribution', providerId: 'arkham',
    unit: tuple.unit, timeBasis: tuple.timeBasis,
    methodologyId: 'different_clustering_algorithm',
  });
  assert.strictEqual(decision.integrityState, 'I3_MATERIAL_MISMATCH');
  assert.strictEqual(decision.permissionState, 'PARTIAL_VIEW_ONLY');
  assert.ok(decision.speakable);
  assert.ok(decision.disclosureRequired);
});

test('compileAllPermissions covers all fields', () => {
  setup();
  const all = compileAllPermissions();
  assert.strictEqual(all.length, Object.keys(FIELD_AUTHORITY_MAP).length);
});

test('getSpeakabilityReport has correct totals', () => {
  setup();
  const report = getSpeakabilityReport();
  assert.strictEqual(report.total, Object.keys(FIELD_AUTHORITY_MAP).length);
  assert.strictEqual(report.speakable + report.suppressed + report.blocked, report.total);
});

// ── Group 5: Field criticality ─────────────────────────────────────────────
console.log('\n▸ Group 5: Field criticality');

test('price.spot.canonical is MISSION_CRITICAL', () => {
  const entry = getFieldCriticality('price.spot.canonical')!;
  assert.strictEqual(entry.criticality, 'MISSION_CRITICAL');
  assert.strictEqual(entry.suppressionAggressiveness, 1.0);
});

test('derivatives.oi.aggregate is MISSION_CRITICAL', () => {
  assert.strictEqual(getFieldCriticality('derivatives.oi.aggregate')!.criticality, 'MISSION_CRITICAL');
});

test('security.token.flags is MISSION_CRITICAL', () => {
  assert.strictEqual(getFieldCriticality('security.token.flags')!.criticality, 'MISSION_CRITICAL');
});

test('narrative.retail.attention is ENRICHMENT_ONLY', () => {
  assert.strictEqual(getFieldCriticality('narrative.retail.attention')!.criticality, 'ENRICHMENT_ONLY');
  assert.strictEqual(getFieldCriticality('narrative.retail.attention')!.suppressionAggressiveness, 0.1);
});

test('getMissionCriticalFields returns at least 4 fields', () => {
  const critical = getMissionCriticalFields();
  assert.ok(critical.length >= 4, `Expected >= 4, got ${critical.length}`);
});

test('Blast radius for price.spot.canonical includes market.cap', () => {
  const radius = getBlastRadius('price.spot.canonical');
  assert.ok(radius.includes('market.cap'));
});

test('getFieldsAffectedByLoss computes transitive blast radius', () => {
  const affected = getFieldsAffectedByLoss('price.spot.canonical');
  assert.ok(affected.length > getBlastRadius('price.spot.canonical').length,
    'Transitive radius should be larger');
});

test('Suppression weight hierarchy: MISSION_CRITICAL > THESIS > CONTEXTUAL > ENRICHMENT', () => {
  assert.ok(CRITICALITY_SUPPRESSION_WEIGHT.MISSION_CRITICAL > CRITICALITY_SUPPRESSION_WEIGHT.THESIS_CRITICAL);
  assert.ok(CRITICALITY_SUPPRESSION_WEIGHT.THESIS_CRITICAL > CRITICALITY_SUPPRESSION_WEIGHT.CONTEXTUAL);
  assert.ok(CRITICALITY_SUPPRESSION_WEIGHT.CONTEXTUAL > CRITICALITY_SUPPRESSION_WEIGHT.ENRICHMENT_ONLY);
});

// ── Group 6: Recovery governor ─────────────────────────────────────────────
console.log('\n▸ Group 6: Recovery governor');

test('Fresh provider → STABLE recovery state', () => {
  setup();
  for (let i = 0; i < 10; i++) recordSuccess('coingecko', 200);
  const recovery = getRecoveryState('coingecko');
  assert.strictEqual(recovery.state, 'STABLE');
  assert.strictEqual(recovery.trustHaircut, 0);
});

test('recordIncident → RECOVERING_UNVERIFIED with 40% haircut', () => {
  setup();
  recordIncident('coinglass');
  const recovery = getRecoveryState('coinglass');
  assert.strictEqual(recovery.state, 'RECOVERING_UNVERIFIED');
  assert.strictEqual(recovery.trustHaircut, RECOVERY_TRUST_HAIRCUT.RECOVERING_UNVERIFIED);
  assert.ok(recovery.incidentTimestamp);
});

test('First clean window → advances past RECOVERING_UNVERIFIED', () => {
  setup();
  recordIncident('coinglass');
  recordCleanWindow('coinglass');
  const recovery = getRecoveryState('coinglass');
  assert.ok(
    recovery.state === 'RECOVERING_PROBATION' || recovery.state === 'RECOVERED_LIMITED',
    `Expected RECOVERING_PROBATION or RECOVERED_LIMITED, got: ${recovery.state}`,
  );
  assert.ok(recovery.cleanWindowCount >= 1);
});

test('3 clean windows → RECOVERED_LIMITED', () => {
  setup();
  recordIncident('coinglass');
  for (let i = 0; i < 10; i++) recordSuccess('coinglass', 150);
  recordCleanWindow('coinglass');
  recordCleanWindow('coinglass');
  recordCleanWindow('coinglass');
  const recovery = getRecoveryState('coinglass');
  assert.strictEqual(recovery.state, 'RECOVERED_LIMITED');
  assert.strictEqual(recovery.trustHaircut, RECOVERY_TRUST_HAIRCUT.RECOVERED_LIMITED);
});

test('5 clean windows → FULLY_RESTORED with zero haircut', () => {
  setup();
  recordIncident('coinglass');
  for (let i = 0; i < 10; i++) recordSuccess('coinglass', 150);
  recordCleanWindow('coinglass');
  for (let i = 0; i < 5; i++) recordCleanWindow('coinglass');
  const recovery = getRecoveryState('coinglass');
  assert.strictEqual(recovery.state, 'FULLY_RESTORED');
  assert.strictEqual(recovery.trustHaircut, 0);
});

test('Failure during recovery → reset to RECOVERING_UNVERIFIED', () => {
  setup();
  recordIncident('goplus');
  recordCleanWindow('goplus');
  recordRecoveryFailure('goplus');
  const recovery = getRecoveryState('goplus');
  assert.strictEqual(recovery.state, 'RECOVERING_UNVERIFIED');
  assert.strictEqual(recovery.cleanWindowCount, 0);
});

test('isInRecovery returns true during probation', () => {
  setup();
  recordIncident('defillama');
  assert.ok(isInRecovery('defillama'));
});

test('isInRecovery returns false for stable provider', () => {
  setup();
  assert.ok(!isInRecovery('coingecko'));
});

test('getProvidersInRecovery lists only recovering providers', () => {
  setup();
  recordIncident('coinglass');
  recordIncident('goplus');
  const recovering = getProvidersInRecovery();
  assert.ok(recovering.length >= 2);
  assert.ok(recovering.every(r => r.state !== 'STABLE' && r.state !== 'FULLY_RESTORED'));
});

// ── Group 7: Permission + Recovery integration ─────────────────────────────
console.log('\n▸ Group 7: Permission + Recovery integration');

test('Recovering provider → permission includes trust haircut', () => {
  setup();
  for (let i = 0; i < 10; i++) recordSuccess('coingecko', 200);
  recordIncident('coingecko');
  const tuple = getFieldTuple('price.spot.canonical')!;
  const decision = compilePermission('price.spot.canonical', {
    fieldId: 'price.spot.canonical', providerId: 'coingecko',
    unit: tuple.unit, quoteBasis: tuple.quoteBasis, venueScope: tuple.venueScope,
    timeBasis: tuple.timeBasis, methodologyId: tuple.methodologyId,
  });
  assert.ok(decision.confidencePenalty > 0, 'Should have recovery haircut');
  assert.ok(decision.disclosureRequired, 'Should require disclosure during recovery');
  assert.ok(decision.reasonCodes.some(r => r.includes('recover') || r.includes('probation')));
});

// ── Group 8: Type system completeness ──────────────────────────────────────
console.log('\n▸ Group 8: Type system completeness');

test('All IntegrityState labels exist', () => {
  const states: IntegrityState[] = ['I0_INTACT', 'I1_MINOR_DRIFT', 'I2_DEGRADED_PARITY', 'I3_MATERIAL_MISMATCH', 'I4_BROKEN', 'I5_UNKNOWN'];
  for (const s of states) assert.ok(INTEGRITY_STATE_LABELS[s], `Missing label for ${s}`);
});

test('All ClaimPermission labels exist', () => {
  const perms: ClaimPermission[] = [
    'ALLOW_PRIMARY', 'ALLOW_PRIMARY_WITH_DISCLOSURE', 'ALLOW_PRIMARY_WITH_HAIRCUT',
    'ALLOW_SUBSTITUTE_FULL', 'ALLOW_SUBSTITUTE_DEGRADED', 'PARTIAL_VIEW_ONLY',
    'PRESERVE_CONTRADICTION', 'SUPPRESS_CLAIM', 'BLOCK_OUTPUT', 'ESCALATE_INCIDENT',
  ];
  for (const p of perms) {
    assert.ok(CLAIM_PERMISSION_LABELS[p], `Missing label for ${p}`);
    assert.ok(typeof CLAIM_PERMISSION_SPEAKABLE[p] === 'boolean', `Missing speakable for ${p}`);
  }
});

test('Speakable permissions are correctly classified', () => {
  assert.ok(CLAIM_PERMISSION_SPEAKABLE.ALLOW_PRIMARY);
  assert.ok(CLAIM_PERMISSION_SPEAKABLE.ALLOW_PRIMARY_WITH_DISCLOSURE);
  assert.ok(CLAIM_PERMISSION_SPEAKABLE.PARTIAL_VIEW_ONLY);
  assert.ok(!CLAIM_PERMISSION_SPEAKABLE.SUPPRESS_CLAIM);
  assert.ok(!CLAIM_PERMISSION_SPEAKABLE.BLOCK_OUTPUT);
  assert.ok(!CLAIM_PERMISSION_SPEAKABLE.ESCALATE_INCIDENT);
});

test('All RecoveryState labels and haircuts exist', () => {
  const states: RecoveryState[] = ['STABLE', 'RECOVERING_UNVERIFIED', 'RECOVERING_PROBATION', 'RECOVERED_LIMITED', 'FULLY_RESTORED'];
  for (const s of states) {
    assert.ok(RECOVERY_STATE_LABELS[s], `Missing label for ${s}`);
    assert.ok(typeof RECOVERY_TRUST_HAIRCUT[s] === 'number', `Missing haircut for ${s}`);
  }
});

test('Recovery haircut decreases as state improves', () => {
  assert.ok(RECOVERY_TRUST_HAIRCUT.RECOVERING_UNVERIFIED > RECOVERY_TRUST_HAIRCUT.RECOVERING_PROBATION);
  assert.ok(RECOVERY_TRUST_HAIRCUT.RECOVERING_PROBATION > RECOVERY_TRUST_HAIRCUT.RECOVERED_LIMITED);
  assert.ok(RECOVERY_TRUST_HAIRCUT.RECOVERED_LIMITED > RECOVERY_TRUST_HAIRCUT.FULLY_RESTORED);
  assert.strictEqual(RECOVERY_TRUST_HAIRCUT.STABLE, 0);
  assert.strictEqual(RECOVERY_TRUST_HAIRCUT.FULLY_RESTORED, 0);
});

// ── Group 9: The core doctrinal test ───────────────────────────────────────
console.log('\n▸ Group 9: Core doctrinal invariants');

test('DOCTRINE: degraded truth ≠ different truth', () => {
  setup();
  for (let i = 0; i < 10; i++) recordSuccess('coinglass', 200);

  const tuple = getFieldTuple('derivatives.funding.aggregate')!;
  const degradedObs: ObservedFieldMetadata = {
    fieldId: 'derivatives.funding.aggregate', providerId: 'coinglass',
    unit: tuple.unit, venueScope: tuple.venueScope,
    timeBasis: tuple.timeBasis, methodologyId: tuple.methodologyId,
  };
  const differentObs: ObservedFieldMetadata = {
    fieldId: 'derivatives.funding.aggregate', providerId: 'coinglass',
    unit: 'percentage', venueScope: 'single_exchange',
    timeBasis: 'rolling_8h', methodologyId: 'simple_average',
  };

  assert.ok(isSameTruthType(degradedObs), 'Matching obs should be same truth type');
  assert.ok(!isSameTruthType(differentObs), 'Different params should NOT be same truth type');
});

test('DOCTRINE: health alone does not decide speech — permission does', () => {
  setup();
  for (let i = 0; i < 10; i++) recordSuccess('coingecko', 200);

  const tuple = getFieldTuple('price.spot.canonical')!;
  const healthyIntact = compilePermission('price.spot.canonical', {
    fieldId: 'price.spot.canonical', providerId: 'coingecko',
    unit: tuple.unit, quoteBasis: tuple.quoteBasis, venueScope: tuple.venueScope,
    timeBasis: tuple.timeBasis, methodologyId: tuple.methodologyId,
  });

  const healthyBroken = compilePermission('price.spot.canonical', {
    fieldId: 'price.spot.canonical', providerId: 'coingecko',
    unit: 'BTC', quoteBasis: 'BTC', venueScope: 'otc',
    timeBasis: 'delayed_24h', methodologyId: 'unknown',
  });

  assert.strictEqual(healthyIntact.healthState, healthyBroken.healthState,
    'Both should have same health state');
  assert.notStrictEqual(healthyIntact.permissionState, healthyBroken.permissionState,
    'But different permissions');
  assert.ok(healthyIntact.speakable);
  assert.ok(!healthyBroken.speakable);
});

test('DOCTRINE: every health decision answers 5 questions', () => {
  setup();
  for (let i = 0; i < 10; i++) recordSuccess('coingecko', 200);
  const decision = compilePermission('price.spot.canonical');
  assert.ok(decision.healthState, 'Q1: Can source be read?');
  assert.ok(decision.integrityState, 'Q2: Can payload be interpreted as same field?');
  assert.ok(decision.truthClass, 'Q3: Can field support class constitution?');
  assert.ok(decision.permissionState, 'Q4: Can Coinet speak this claim?');
  assert.ok(typeof decision.confidencePenalty === 'number', 'Q5: Under what scar?');
});

// ── Results ────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════');
console.log(` RESULTS: ${passed}/${total} passed`);
if (passed === total) {
  console.log(' ✅ ALL L1.4.1 SPEECH CONTROL TESTS PASSED');
} else {
  console.log(` ❌ ${total - passed} FAILED`);
}
console.log('═══════════════════════════════════════════════════\n');

process.exit(passed === total ? 0 : 1);
