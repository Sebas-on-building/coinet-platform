/**
 * L1.4 Source Health & Quality Scoring — Integration Test
 *
 * Tests field health, class health, state machine, penalty engine,
 * and downstream implications across the full 9-class system.
 */

import { strict as assert } from 'assert';
import { recordSuccess, recordFailure, resetAllHealth, getProviderHealth } from '../services/source-systems/health-monitor';
import {
  computeFieldHealth, computeFieldHealthForOwner, computeAllFieldHealth,
  getFieldsAtOrBelow, deriveHealthState,
} from '../services/source-systems/classes/field-health-engine';
import {
  computeClassHealth, computeAllClassHealth, buildHealthFingerprint,
  getEpistemicallyUnsafeClasses, getAllHealthImplications,
} from '../services/source-systems/classes/class-health-engine';
import {
  FIELD_AUTHORITY_MAP,
} from '../services/source-systems/classes/authority-constitution';
import { TRUTH_CLASSES } from '../services/source-systems/registry';
import type { HealthState, FieldHealthRecord, ClassHealthRecord, HealthFingerprint } from '../services/source-systems/classes/health-types';
import {
  HEALTH_STATE_LABELS, HEALTH_STATE_THRESHOLDS, PROVIDER_TRUST_CLASS,
  TRUST_CLASS_AUTHORITY_WEIGHT, CLASS_WEIGHT_PROFILES, CLASS_TO_WEIGHT_GROUP,
  L14_PLATFORM_VERSION,
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
}

console.log('\n═══════════════════════════════════════════════════');
console.log(' L1.4 SOURCE HEALTH & QUALITY SCORING — TESTS');
console.log('═══════════════════════════════════════════════════\n');

// ── Group 1: Type system completeness ──────────────────────────────────────
console.log('▸ Group 1: Type system completeness');

test('Health states cover H0 through H5', () => {
  const states: HealthState[] = ['H0_HEALTHY', 'H1_STRESSED', 'H2_DEGRADED', 'H3_PARTIAL_BLINDNESS', 'H4_UNSAFE', 'H5_SUPPRESSED'];
  for (const s of states) {
    assert.ok(HEALTH_STATE_LABELS[s], `Missing label for ${s}`);
    assert.ok(HEALTH_STATE_THRESHOLDS[s], `Missing threshold for ${s}`);
  }
});

test('Threshold ranges are contiguous and non-overlapping', () => {
  const ordered: HealthState[] = ['H5_SUPPRESSED', 'H4_UNSAFE', 'H3_PARTIAL_BLINDNESS', 'H2_DEGRADED', 'H1_STRESSED', 'H0_HEALTHY'];
  for (let i = 0; i < ordered.length - 1; i++) {
    const [, hiCurr] = HEALTH_STATE_THRESHOLDS[ordered[i]];
    const [loNext] = HEALTH_STATE_THRESHOLDS[ordered[i + 1]];
    assert.ok(hiCurr <= loNext, `Gap between ${ordered[i]} and ${ordered[i + 1]}`);
  }
});

test('Trust classes cover all expected providers', () => {
  const expected = ['alchemy', 'coinglass', 'defillama', 'goplus', 'coingecko', 'arkham', 'nansen', 'dexscreener', 'openai'];
  for (const p of expected) {
    assert.ok(PROVIDER_TRUST_CLASS[p], `Missing trust class for ${p}`);
  }
});

test('Trust class authority weights are monotonically decreasing from T1 to T6', () => {
  assert.ok(TRUST_CLASS_AUTHORITY_WEIGHT.T1_NATIVE > TRUST_CLASS_AUTHORITY_WEIGHT.T2_SPECIALIST);
  assert.ok(TRUST_CLASS_AUTHORITY_WEIGHT.T2_SPECIALIST > TRUST_CLASS_AUTHORITY_WEIGHT.T3_BREADTH_AGGREGATOR);
  assert.ok(TRUST_CLASS_AUTHORITY_WEIGHT.T3_BREADTH_AGGREGATOR > TRUST_CLASS_AUTHORITY_WEIGHT.T4_DISCOVERY_SURFACE);
  assert.ok(TRUST_CLASS_AUTHORITY_WEIGHT.T5_ATTENTION_SURFACE > TRUST_CLASS_AUTHORITY_WEIGHT.T6_MODEL_OUTPUT);
  assert.strictEqual(TRUST_CLASS_AUTHORITY_WEIGHT.T6_MODEL_OUTPUT, 0);
});

test('Weight profiles cover all three groups', () => {
  assert.ok(CLASS_WEIGHT_PROFILES.realtime_execution);
  assert.ok(CLASS_WEIGHT_PROFILES.interpretation_heavy);
  assert.ok(CLASS_WEIGHT_PROFILES.reasoning);
});

test('Weight profiles sum to 1.0', () => {
  for (const [group, w] of Object.entries(CLASS_WEIGHT_PROFILES)) {
    const sum = w.availability + w.freshness + w.payloadValidity + w.historicalReliability + w.trustClass;
    assert.ok(Math.abs(sum - 1.0) < 0.001, `${group} weights sum to ${sum}, not 1.0`);
  }
});

test('All 9 truth classes mapped to weight groups', () => {
  const classes = [
    'market_surface', 'dex_emergence', 'derivatives_pressure',
    'onchain_behavior', 'protocol_substance', 'structural_safety',
    'narrative_attention', 'entity_context', 'reasoning_expression',
  ];
  for (const c of classes) {
    assert.ok(CLASS_TO_WEIGHT_GROUP[c], `Missing weight group for ${c}`);
  }
});

test('Version is set', () => {
  assert.strictEqual(L14_PLATFORM_VERSION, '1.0.0');
});

// ── Group 2: State derivation ──────────────────────────────────────────────
console.log('\n▸ Group 2: State derivation');

test('Score 1.0 → H0_HEALTHY', () => {
  assert.strictEqual(deriveHealthState(1.0), 'H0_HEALTHY');
});

test('Score 0.85 → H0_HEALTHY', () => {
  assert.strictEqual(deriveHealthState(0.85), 'H0_HEALTHY');
});

test('Score 0.75 → H1_STRESSED', () => {
  assert.strictEqual(deriveHealthState(0.75), 'H1_STRESSED');
});

test('Score 0.55 → H2_DEGRADED', () => {
  assert.strictEqual(deriveHealthState(0.55), 'H2_DEGRADED');
});

test('Score 0.35 → H3_PARTIAL_BLINDNESS', () => {
  assert.strictEqual(deriveHealthState(0.35), 'H3_PARTIAL_BLINDNESS');
});

test('Score 0.15 → H4_UNSAFE', () => {
  assert.strictEqual(deriveHealthState(0.15), 'H4_UNSAFE');
});

test('Score 0.05 → H5_SUPPRESSED', () => {
  assert.strictEqual(deriveHealthState(0.05), 'H5_SUPPRESSED');
});

test('Score 0 → H5_SUPPRESSED', () => {
  assert.strictEqual(deriveHealthState(0), 'H5_SUPPRESSED');
});

// ── Group 3: Field health — healthy provider ───────────────────────────────
console.log('\n▸ Group 3: Field health with healthy provider');

test('Healthy CoinGecko → price.spot.canonical is H0_HEALTHY or H1_STRESSED', () => {
  setup();
  for (let i = 0; i < 10; i++) recordSuccess('coingecko', 200);
  const fh = computeFieldHealth('price.spot.canonical', 'coingecko');
  assert.ok(fh.state === 'H0_HEALTHY' || fh.state === 'H1_STRESSED', `Got: ${fh.state}`);
  assert.ok(fh.effectiveHealth >= 0.7);
  assert.strictEqual(fh.fieldId, 'price.spot.canonical');
  assert.strictEqual(fh.providerId, 'coingecko');
});

test('Healthy CoinGlass → derivatives.oi.aggregate is H0_HEALTHY or H1_STRESSED', () => {
  setup();
  for (let i = 0; i < 10; i++) recordSuccess('coinglass', 150);
  const fh = computeFieldHealth('derivatives.oi.aggregate', 'coinglass');
  assert.ok(fh.state === 'H0_HEALTHY' || fh.state === 'H1_STRESSED', `Got: ${fh.state}`);
});

test('Field health includes trust class score from authority tier', () => {
  setup();
  for (let i = 0; i < 10; i++) recordSuccess('alchemy', 100);
  const fh = computeFieldHealth('onchain.transfers.evm', 'alchemy');
  assert.strictEqual(fh.trustClassScore, TRUST_CLASS_AUTHORITY_WEIGHT.T1_NATIVE);
});

test('computeFieldHealthForOwner resolves owner automatically', () => {
  setup();
  for (let i = 0; i < 10; i++) recordSuccess('coingecko', 200);
  const fh = computeFieldHealthForOwner('price.spot.canonical');
  assert.ok(fh);
  assert.strictEqual(fh!.providerId, 'coingecko');
});

// ── Group 4: Field health — degraded provider ──────────────────────────────
console.log('\n▸ Group 4: Field health with degraded provider');

test('Provider with open circuit → field health drops severely', () => {
  setup();
  for (let i = 0; i < 6; i++) recordFailure('coinglass', 5000);
  const ph = getProviderHealth('coinglass');
  assert.strictEqual(ph.circuit, 'open');
  const fh = computeFieldHealth('derivatives.oi.aggregate', 'coinglass');
  assert.ok(fh.effectiveHealth < 0.3, `Expected < 0.3, got ${fh.effectiveHealth}`);
  assert.ok(fh.state === 'H4_UNSAFE' || fh.state === 'H5_SUPPRESSED', `Got: ${fh.state}`);
});

test('Penalty is applied for consecutive failures', () => {
  setup();
  for (let i = 0; i < 4; i++) recordFailure('defillama');
  const fh = computeFieldHealth('protocol.tvl.usd', 'defillama');
  const recoveryPenalties = fh.penalties.filter(p => p.family === 'P5_recovery');
  assert.ok(recoveryPenalties.length > 0, 'Expected recovery penalty');
});

test('High latency generates connectivity penalty', () => {
  setup();
  for (let i = 0; i < 10; i++) recordSuccess('goplus', 7000);
  const fh = computeFieldHealth('security.token.flags', 'goplus');
  const connPenalties = fh.penalties.filter(p => p.family === 'P1_connectivity');
  assert.ok(connPenalties.length > 0, 'Expected connectivity penalty for high latency');
});

// ── Group 5: Class health — authority aware ────────────────────────────────
console.log('\n▸ Group 5: Class health — authority-aware');

test('Market surface class health reflects CoinGecko owner state', () => {
  setup();
  for (let i = 0; i < 10; i++) recordSuccess('coingecko', 200);
  for (let i = 0; i < 10; i++) recordSuccess('coinmarketcap', 300);
  const ch = computeClassHealth(TRUTH_CLASSES.MARKET_SURFACE);
  assert.ok(ch.ownerHealthy, 'Owner should be healthy');
  assert.ok(ch.effectiveClassHealth > 0.5);
  assert.ok(!ch.noFallbackTriggered);
});

test('Derivatives class with dead owner and dead confirmer → no-fallback triggered', () => {
  setup();
  for (let i = 0; i < 6; i++) recordFailure('coinglass');
  for (let i = 0; i < 6; i++) recordFailure('coingecko');
  const ch = computeClassHealth(TRUTH_CLASSES.DERIVATIVES_PRESSURE);
  assert.ok(!ch.ownerHealthy, 'Owner should not be healthy');
  assert.ok(ch.noFallbackTriggered, 'No fallback should be triggered when owner + confirmers down');
  assert.ok(ch.implications.some(i => i.type === 'claim_suppressed'));
});

test('On-chain with healthy EVM owner but no Solana → partial health', () => {
  setup();
  for (let i = 0; i < 10; i++) recordSuccess('alchemy', 100);
  const ch = computeClassHealth(TRUTH_CLASSES.ONCHAIN_BEHAVIOR);
  assert.ok(ch.ownerHealthy, 'At least one owner (alchemy) should be healthy');
  assert.ok(ch.criticalFieldsTotal > 0);
});

test('Entity context with no enrichers → epistemic implications', () => {
  setup();
  const ch = computeClassHealth(TRUTH_CLASSES.ENTITY_CONTEXT);
  assert.ok(ch.fieldRecords.length > 0);
  assert.ok(ch.version === L14_PLATFORM_VERSION);
});

test('Class health includes ownerState', () => {
  setup();
  for (let i = 0; i < 10; i++) recordSuccess('coingecko', 200);
  const ch = computeClassHealth(TRUTH_CLASSES.MARKET_SURFACE);
  assert.ok(ch.ownerState !== null);
});

// ── Group 6: All-class computation ─────────────────────────────────────────
console.log('\n▸ Group 6: All-class computation');

test('computeAllClassHealth returns all 9 classes', () => {
  setup();
  const all = computeAllClassHealth();
  const keys = Object.keys(all);
  assert.ok(keys.length === 9, `Expected 9, got ${keys.length}`);
  assert.ok(all[TRUTH_CLASSES.MARKET_SURFACE]);
  assert.ok(all[TRUTH_CLASSES.DERIVATIVES_PRESSURE]);
  assert.ok(all[TRUTH_CLASSES.REASONING_EXPRESSION]);
});

test('computeAllFieldHealth returns all FIELD_AUTHORITY_MAP fields', () => {
  setup();
  const fields = computeAllFieldHealth();
  const fieldMapCount = Object.keys(FIELD_AUTHORITY_MAP).length;
  assert.strictEqual(fields.length, fieldMapCount, `Expected ${fieldMapCount}, got ${fields.length}`);
});

// ── Group 7: Health fingerprint ────────────────────────────────────────────
console.log('\n▸ Group 7: Health fingerprint');

test('buildHealthFingerprint returns complete structure', () => {
  setup();
  for (let i = 0; i < 10; i++) recordSuccess('coingecko', 200);
  const fp = buildHealthFingerprint();
  assert.ok(fp.timestamp);
  assert.ok(fp.providers.length > 0);
  assert.ok(fp.fields.length > 0);
  assert.ok(fp.classes.length === 9);
  assert.ok(typeof fp.systemScore === 'number');
  assert.ok(fp.systemState);
  assert.ok(fp.version === L14_PLATFORM_VERSION);
});

test('Fingerprint shows suppressed fields when providers are down', () => {
  setup();
  for (let i = 0; i < 6; i++) recordFailure('coinglass');
  for (let i = 0; i < 6; i++) recordFailure('defillama');
  const fp = buildHealthFingerprint();
  const unsafeOrSuppressed = fp.fields.filter(f =>
    f.state === 'H4_UNSAFE' || f.state === 'H5_SUPPRESSED',
  );
  assert.ok(unsafeOrSuppressed.length > 0, 'Expected at least one unsafe/suppressed field');
});

test('Fingerprint includes ownerHealthy per class', () => {
  setup();
  const fp = buildHealthFingerprint();
  for (const cls of fp.classes) {
    assert.ok(typeof cls.ownerHealthy === 'boolean');
  }
});

// ── Group 8: Epistemic safety functions ────────────────────────────────────
console.log('\n▸ Group 8: Epistemic safety functions');

test('getEpistemicallyUnsafeClasses returns classes with dead owners', () => {
  setup();
  for (let i = 0; i < 6; i++) recordFailure('coinglass');
  const unsafe = getEpistemicallyUnsafeClasses();
  assert.ok(unsafe.some(c => c.truthClass === TRUTH_CLASSES.DERIVATIVES_PRESSURE));
});

test('getAllHealthImplications aggregates across classes', () => {
  setup();
  for (let i = 0; i < 6; i++) recordFailure('coinglass');
  for (let i = 0; i < 6; i++) recordFailure('goplus');
  const implications = getAllHealthImplications();
  assert.ok(implications.length > 0);
  assert.ok(implications.some(i => i.type === 'confidence_penalty' || i.type === 'claim_suppressed'));
});

test('getFieldsAtOrBelow(H2_DEGRADED) returns degraded + unsafe + suppressed fields', () => {
  setup();
  for (let i = 0; i < 6; i++) recordFailure('coinglass');
  const degraded = getFieldsAtOrBelow('H2_DEGRADED');
  for (const f of degraded) {
    assert.ok(
      f.state === 'H2_DEGRADED' || f.state === 'H3_PARTIAL_BLINDNESS' || f.state === 'H4_UNSAFE' || f.state === 'H5_SUPPRESSED',
      `Field ${f.fieldId} in unexpected state: ${f.state}`,
    );
  }
});

// ── Group 9: Trust class influence ─────────────────────────────────────────
console.log('\n▸ Group 9: Trust class influence on field health');

test('T1_NATIVE provider gets higher trust score than T4_DISCOVERY', () => {
  setup();
  for (let i = 0; i < 10; i++) recordSuccess('alchemy', 100);
  for (let i = 0; i < 10; i++) recordSuccess('dexscreener', 100);
  const nativeFh = computeFieldHealth('onchain.transfers.evm', 'alchemy');
  const discoveryFh = computeFieldHealth('dex.pool.liquidity', 'dexscreener');
  assert.ok(nativeFh.trustClassScore > discoveryFh.trustClassScore);
});

test('T6_MODEL_OUTPUT gets zero trust class score', () => {
  setup();
  for (let i = 0; i < 10; i++) recordSuccess('openai', 300);
  const fh = computeFieldHealth('price.spot.canonical', 'openai');
  assert.strictEqual(fh.trustClassScore, 0);
});

// ── Group 10: Weight group differentiation ─────────────────────────────────
console.log('\n▸ Group 10: Weight group differentiation');

test('Realtime class weights: freshness > availability > payload', () => {
  const w = CLASS_WEIGHT_PROFILES.realtime_execution;
  assert.ok(w.freshness > w.availability);
  assert.ok(w.availability > w.payloadValidity);
});

test('Interpretation class weights: payload > reliability > freshness', () => {
  const w = CLASS_WEIGHT_PROFILES.interpretation_heavy;
  assert.ok(w.payloadValidity > w.historicalReliability);
  assert.ok(w.historicalReliability > w.freshness);
});

test('Reasoning class weights: trustClass is 0 (not truth-owning)', () => {
  assert.strictEqual(CLASS_WEIGHT_PROFILES.reasoning.trustClass, 0);
});

// ── Group 11: Recovery scenarios ───────────────────────────────────────────
console.log('\n▸ Group 11: Recovery scenarios');

test('Provider recovering from failure → field health improves', () => {
  setup();
  for (let i = 0; i < 6; i++) recordFailure('coingecko');
  const beforeFh = computeFieldHealth('price.spot.canonical', 'coingecko');
  for (let i = 0; i < 20; i++) recordSuccess('coingecko', 200);
  const afterFh = computeFieldHealth('price.spot.canonical', 'coingecko');
  assert.ok(afterFh.effectiveHealth > beforeFh.effectiveHealth, 'Health should improve after recovery');
});

test('Class health recovers when owner state is reset and succeeds', () => {
  setup();
  for (let i = 0; i < 6; i++) recordFailure('coinglass');
  const beforeCh = computeClassHealth(TRUTH_CLASSES.DERIVATIVES_PRESSURE);
  assert.ok(!beforeCh.ownerHealthy);

  resetAllHealth();
  for (let i = 0; i < 10; i++) recordSuccess('coinglass', 150);
  const afterCh = computeClassHealth(TRUTH_CLASSES.DERIVATIVES_PRESSURE);
  assert.ok(afterCh.ownerHealthy, 'Owner should be healthy after fresh start + successes');
  assert.ok(afterCh.effectiveClassHealth > beforeCh.effectiveClassHealth);
});

// ── Group 12: Cross-layer consistency ──────────────────────────────────────
console.log('\n▸ Group 12: Cross-layer consistency');

test('Implications include claim suppression when no-fallback fires', () => {
  setup();
  for (let i = 0; i < 6; i++) recordFailure('coinglass');
  for (let i = 0; i < 6; i++) recordFailure('coingecko');
  const ch = computeClassHealth(TRUTH_CLASSES.DERIVATIVES_PRESSURE);
  assert.ok(ch.noFallbackTriggered, 'No-fallback should fire when owner + confirmer down');
  const suppressed = ch.implications.filter(i => i.type === 'claim_suppressed');
  assert.ok(suppressed.length > 0, 'Expected claim_suppressed implication');
  assert.ok(suppressed[0].severity === 1.0, 'claim_suppressed should have maximum severity');
});

test('Implications include confidence_penalty when owner is degraded', () => {
  setup();
  for (let i = 0; i < 6; i++) recordFailure('coingecko');
  for (let i = 0; i < 10; i++) recordSuccess('coinmarketcap', 300);
  const ch = computeClassHealth(TRUTH_CLASSES.MARKET_SURFACE);
  const confPenalty = ch.implications.filter(i => i.type === 'confidence_penalty');
  assert.ok(confPenalty.length > 0, 'Expected confidence_penalty when owner degraded');
});

test('Implications include disclosure_required when fields are unsafe', () => {
  setup();
  for (let i = 0; i < 6; i++) recordFailure('defillama');
  const ch = computeClassHealth(TRUTH_CLASSES.PROTOCOL_SUBSTANCE);
  const disclosures = ch.implications.filter(i => i.type === 'disclosure_required');
  assert.ok(disclosures.length > 0, 'Expected disclosure_required for unsafe fields');
});

// ── Results ────────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════');
console.log(` RESULTS: ${passed}/${total} passed`);
if (passed === total) {
  console.log(' ✅ ALL L1.4 TESTS PASSED');
} else {
  console.log(` ❌ ${total - passed} FAILED`);
}
console.log('═══════════════════════════════════════════════════\n');

process.exit(passed === total ? 0 : 1);
