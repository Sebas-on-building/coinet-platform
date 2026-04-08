import assert from 'assert';
import { TRUTH_CLASSES } from '../services/source-systems/registry';
import {
  CLASS_AUTHORITY, FIELD_AUTHORITY_MAP, L12_VERSION,
  getClassAuthority, getAllClassAuthorities, getFieldAuthority,
  getFieldsForClass, getProviderRole, isProviderProhibited,
  getOwners, getConfirmers, getEnrichers,
  type AuthorityRole,
} from '../services/source-systems/classes/authority-constitution';
import {
  resolveFieldAuthority, resolveClassAuthority, resolveAllAuthority,
  validateProviderAuthority, detectCoPrimaryDisagreement,
} from '../services/source-systems/classes/authority-resolver';
import { recordSuccess, recordFailure, resetAllHealth } from '../services/source-systems/health-monitor';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e: any) {
    failed++;
    console.log(`  ❌ ${name}: ${e.message}`);
  }
}

console.log('\n══════════════════════════════════════════════════');
console.log('  L1.2 SOURCE AUTHORITY HIERARCHY — FULL TEST SUITE');
console.log('══════════════════════════════════════════════════\n');

// Reset health state for clean tests
resetAllHealth();

// ── Test 1: All 9 classes have authority constitutions ───────────────────────

console.log('Test 1: All 9 classes defined');

const ALL_CLASSES = [
  TRUTH_CLASSES.MARKET_SURFACE, TRUTH_CLASSES.DEX_EMERGENCE,
  TRUTH_CLASSES.DERIVATIVES_PRESSURE, TRUTH_CLASSES.PROTOCOL_SUBSTANCE,
  TRUTH_CLASSES.ONCHAIN_BEHAVIOR, TRUTH_CLASSES.STRUCTURAL_SAFETY,
  TRUTH_CLASSES.NARRATIVE_ATTENTION, TRUTH_CLASSES.ENTITY_CONTEXT,
  TRUTH_CLASSES.REASONING_EXPRESSION,
];

test('exactly 9 class authorities exist', () => {
  assert.strictEqual(getAllClassAuthorities().length, 9);
});

for (const tc of ALL_CLASSES) {
  test(`authority exists for ${tc}`, () => {
    const a = getClassAuthority(tc);
    assert(a, `Missing authority for ${tc}`);
    assert(a.providers.length > 0, `No providers for ${tc}`);
    assert(a.noFallbackLine.length > 10, `No fallback line for ${tc}`);
    assert(a.antiAuthorityRules.length > 0, `No anti-authority rules for ${tc}`);
    assert(a.productionLaw.length > 0, `No production law for ${tc}`);
    assert.strictEqual(a.version, L12_VERSION);
  });
}

// ── Test 2: Authority roles correctly assigned ──────────────────────────────

console.log('\nTest 2: Authority roles');

test('coingecko is owner for market_surface', () => {
  assert.strictEqual(getProviderRole(TRUTH_CLASSES.MARKET_SURFACE, 'coingecko'), 'owner');
});
test('coinglass is owner for derivatives_pressure', () => {
  assert.strictEqual(getProviderRole(TRUTH_CLASSES.DERIVATIVES_PRESSURE, 'coinglass'), 'owner');
});
test('defillama is owner for protocol_substance', () => {
  assert.strictEqual(getProviderRole(TRUTH_CLASSES.PROTOCOL_SUBSTANCE, 'defillama'), 'owner');
});
test('alchemy is owner for onchain_behavior', () => {
  assert.strictEqual(getProviderRole(TRUTH_CLASSES.ONCHAIN_BEHAVIOR, 'alchemy'), 'owner');
});
test('goplus is owner for structural_safety', () => {
  assert.strictEqual(getProviderRole(TRUTH_CLASSES.STRUCTURAL_SAFETY, 'goplus'), 'owner');
});
test('geckoterminal is owner for dex_emergence', () => {
  assert.strictEqual(getProviderRole(TRUTH_CLASSES.DEX_EMERGENCE, 'geckoterminal'), 'owner');
});
test('cryptopanic is owner for narrative news', () => {
  assert.strictEqual(getProviderRole(TRUTH_CLASSES.NARRATIVE_ATTENTION, 'cryptopanic'), 'owner');
});
test('lunarcrush is owner for narrative social', () => {
  assert.strictEqual(getProviderRole(TRUTH_CLASSES.NARRATIVE_ATTENTION, 'lunarcrush'), 'owner');
});
test('arkham is owner for entity_context', () => {
  assert.strictEqual(getProviderRole(TRUTH_CLASSES.ENTITY_CONTEXT, 'arkham'), 'owner');
});
test('nansen is co-owner for entity_context', () => {
  assert.strictEqual(getProviderRole(TRUTH_CLASSES.ENTITY_CONTEXT, 'nansen'), 'owner');
});

// ── Test 3: Enrichment vs ownership correctly separated ─────────────────────

console.log('\nTest 3: Enrichment separation');

test('arkham is enricher for onchain_behavior, not owner', () => {
  assert.strictEqual(getProviderRole(TRUTH_CLASSES.ONCHAIN_BEHAVIOR, 'arkham'), 'enricher');
});
test('nansen is enricher for onchain_behavior, not owner', () => {
  assert.strictEqual(getProviderRole(TRUTH_CLASSES.ONCHAIN_BEHAVIOR, 'nansen'), 'enricher');
});
test('onchain enrichers = [arkham, nansen]', () => {
  const enrichers = getEnrichers(TRUTH_CLASSES.ONCHAIN_BEHAVIOR);
  assert(enrichers.includes('arkham'));
  assert(enrichers.includes('nansen'));
});

// ── Test 4: Prohibited non-owners ───────────────────────────────────────────

console.log('\nTest 4: Prohibited non-owners');

test('dexscreener is prohibited for market_surface', () => {
  assert(isProviderProhibited(TRUTH_CLASSES.MARKET_SURFACE, 'dexscreener'));
});
test('openai is prohibited for market_surface', () => {
  assert(isProviderProhibited(TRUTH_CLASSES.MARKET_SURFACE, 'openai'));
});
test('coingecko is prohibited for dex_emergence', () => {
  assert(isProviderProhibited(TRUTH_CLASSES.DEX_EMERGENCE, 'coingecko'));
});
test('openai is prohibited for derivatives_pressure', () => {
  assert(isProviderProhibited(TRUTH_CLASSES.DERIVATIVES_PRESSURE, 'openai'));
});
test('coingecko is prohibited for protocol_substance', () => {
  assert(isProviderProhibited(TRUTH_CLASSES.PROTOCOL_SUBSTANCE, 'coingecko'));
});
test('openai is prohibited for onchain_behavior', () => {
  assert(isProviderProhibited(TRUTH_CLASSES.ONCHAIN_BEHAVIOR, 'openai'));
});
test('openai is prohibited for entity_context', () => {
  assert(isProviderProhibited(TRUTH_CLASSES.ENTITY_CONTEXT, 'openai'));
});

// ── Test 5: Field-level authority maps ──────────────────────────────────────

console.log('\nTest 5: Field-level authority maps');

const expectedFields = Object.keys(FIELD_AUTHORITY_MAP);
test(`${expectedFields.length} field authority entries exist`, () => {
  assert(expectedFields.length >= 20, `Only ${expectedFields.length} fields defined`);
});

test('price.spot.canonical owned by coingecko', () => {
  const f = getFieldAuthority('price.spot.canonical')!;
  assert.strictEqual(f.owner, 'coingecko');
});
test('derivatives.oi.aggregate owned by coinglass', () => {
  const f = getFieldAuthority('derivatives.oi.aggregate')!;
  assert.strictEqual(f.owner, 'coinglass');
});
test('protocol.tvl.usd owned by defillama', () => {
  const f = getFieldAuthority('protocol.tvl.usd')!;
  assert.strictEqual(f.owner, 'defillama');
});
test('onchain.transfers.evm owned by alchemy', () => {
  const f = getFieldAuthority('onchain.transfers.evm')!;
  assert.strictEqual(f.owner, 'alchemy');
  assert(f.enrichers.includes('arkham'));
  assert(f.enrichers.includes('nansen'));
});
test('security.token.flags owned by goplus', () => {
  const f = getFieldAuthority('security.token.flags')!;
  assert.strictEqual(f.owner, 'goplus');
});
test('entity.wallet.labels owned by arkham', () => {
  const f = getFieldAuthority('entity.wallet.labels')!;
  assert.strictEqual(f.owner, 'arkham');
  assert(f.confirmers.includes('nansen'));
});
test('openai prohibited from security.token.flags', () => {
  const f = getFieldAuthority('security.token.flags')!;
  assert(f.prohibitedNonOwners.includes('openai'));
});

// ── Test 6: Authority resolution — healthy owner ────────────────────────────

console.log('\nTest 6: Resolution — healthy owner');

resetAllHealth();
recordSuccess('coingecko', 100);
recordSuccess('coinglass', 80);
recordSuccess('defillama', 120);

test('price.spot.canonical resolves to owner', () => {
  const r = resolveFieldAuthority('price.spot.canonical');
  assert.strictEqual(r.action, 'owner_used');
  assert.strictEqual(r.selectedProvider, 'coingecko');
  assert.strictEqual(r.confidencePenalty, 0);
  assert(!r.claimSuppressed);
});

test('derivatives.oi.aggregate resolves to owner', () => {
  const r = resolveFieldAuthority('derivatives.oi.aggregate');
  assert.strictEqual(r.action, 'owner_used');
  assert.strictEqual(r.selectedProvider, 'coinglass');
});

// ── Test 7: Resolution — confirmer fallback ─────────────────────────────────

console.log('\nTest 7: Resolution — confirmer fallback');

resetAllHealth();
// coingecko fails, coinmarketcap healthy
for (let i = 0; i < 6; i++) recordFailure('coingecko');
recordSuccess('coinmarketcap', 90);

test('price.spot.canonical falls back to confirmer', () => {
  const r = resolveFieldAuthority('price.spot.canonical');
  assert.strictEqual(r.action, 'confirmer_fallback');
  assert.strictEqual(r.selectedProvider, 'coinmarketcap');
  assert(r.confidencePenalty > 0, 'Fallback must carry penalty');
  assert(!r.claimSuppressed);
});

// ── Test 8: Resolution — claim suppressed ───────────────────────────────────

console.log('\nTest 8: Resolution — claim suppressed');

resetAllHealth();
for (let i = 0; i < 6; i++) recordFailure('coinglass');

test('derivatives.oi.aggregate suppressed when no authority', () => {
  const r = resolveFieldAuthority('derivatives.oi.aggregate');
  assert.strictEqual(r.action, 'claim_suppressed');
  assert.strictEqual(r.selectedProvider, null);
  assert(r.claimSuppressed);
  assert.strictEqual(r.confidencePenalty, 1.0);
});

// ── Test 9: Resolution — enrichment only ────────────────────────────────────

console.log('\nTest 9: Resolution — enrichment only');

resetAllHealth();
for (let i = 0; i < 6; i++) recordFailure('alchemy');
for (let i = 0; i < 6; i++) recordFailure('etherscan');
recordSuccess('arkham', 50);

test('onchain.transfers.evm falls to enrichment-only', () => {
  const r = resolveFieldAuthority('onchain.transfers.evm');
  assert.strictEqual(r.action, 'enrichment_only');
  assert.strictEqual(r.selectedProvider, 'arkham');
  assert(r.confidencePenalty >= 0.3, 'Enrichment-only must carry heavy penalty');
});

// ── Test 10: Co-primary detection ───────────────────────────────────────────

console.log('\nTest 10: Co-primary detection');

test('entity_context has co-primaries', () => {
  const d = detectCoPrimaryDisagreement(TRUTH_CLASSES.ENTITY_CONTEXT);
  assert(d.hasCoPrimaries);
  assert.strictEqual(d.policy?.type, 'preserve_contradiction');
});

test('narrative_attention has co-primaries (news + social)', () => {
  const d = detectCoPrimaryDisagreement(TRUTH_CLASSES.NARRATIVE_ATTENTION);
  assert(d.hasCoPrimaries);
});

test('derivatives_pressure has no co-primaries', () => {
  const d = detectCoPrimaryDisagreement(TRUTH_CLASSES.DERIVATIVES_PRESSURE);
  assert(!d.hasCoPrimaries);
});

// ── Test 11: Co-primary agreement resolution ────────────────────────────────

console.log('\nTest 11: Co-primary agreement');

resetAllHealth();
recordSuccess('arkham', 100);
recordSuccess('nansen', 90);

test('entity.wallet.labels resolves co-primary agreement', () => {
  const r = resolveFieldAuthority('entity.wallet.labels');
  assert.strictEqual(r.action, 'co_primary_agreement');
  assert.strictEqual(r.confidencePenalty, 0);
});

// ── Test 12: Provider authority validation ───────────────────────────────────

console.log('\nTest 12: Provider authority validation');

test('openai attempting price.spot.canonical → violation', () => {
  const v = validateProviderAuthority('price.spot.canonical', 'openai');
  assert(v.length > 0);
  assert.strictEqual(v[0].severity, 'critical');
});

test('coingecko attempting price.spot.canonical → no violation', () => {
  const v = validateProviderAuthority('price.spot.canonical', 'coingecko');
  assert.strictEqual(v.length, 0);
});

test('dexscreener attempting security.token.flags → violation', () => {
  const v = validateProviderAuthority('security.token.flags', 'dexscreener');
  assert(v.length > 0);
});

// ── Test 13: Full system resolution ─────────────────────────────────────────

console.log('\nTest 13: Full system resolution');

resetAllHealth();
// Make enough providers healthy
recordSuccess('coingecko', 100);
recordSuccess('coinglass', 80);
recordSuccess('defillama', 100);
recordSuccess('alchemy', 50);
recordSuccess('goplus', 100);
recordSuccess('geckoterminal', 80);
recordSuccess('cryptopanic', 100);
recordSuccess('lunarcrush', 90);
recordSuccess('arkham', 100);
recordSuccess('nansen', 80);
recordSuccess('openai', 50);

test('full resolution covers all fields', () => {
  const r = resolveAllAuthority();
  assert(r.totalFields >= 20);
});

test('full resolution with healthy providers = system healthy', () => {
  const r = resolveAllAuthority();
  assert(r.systemHealthy, `System not healthy: ${r.totalSuppressed} suppressed`);
});

// ── Test 14: Anti-authority rules documented ─────────────────────────────────

console.log('\nTest 14: Anti-authority rules');

for (const tc of ALL_CLASSES) {
  test(`${tc} has anti-authority rules`, () => {
    const a = getClassAuthority(tc)!;
    assert(a.antiAuthorityRules.length > 0);
  });
}

test('structural safety anti-authority includes bullish override prohibition', () => {
  const a = getClassAuthority(TRUTH_CLASSES.STRUCTURAL_SAFETY)!;
  assert(a.antiAuthorityRules.some(r => r.includes('bullish')));
});

test('reasoning anti-authority includes contradiction compression prohibition', () => {
  const a = getClassAuthority(TRUTH_CLASSES.REASONING_EXPRESSION)!;
  assert(a.antiAuthorityRules.some(r => r.includes('contradiction')));
});

// ── Test 15: Disagreement policies ──────────────────────────────────────────

console.log('\nTest 15: Disagreement policies');

test('market_surface disagreement = preserve_contradiction', () => {
  const a = getClassAuthority(TRUTH_CLASSES.MARKET_SURFACE)!;
  assert.strictEqual(a.coPrimaryDisagreement.type, 'preserve_contradiction');
});
test('entity_context disagreement = preserve_contradiction', () => {
  const a = getClassAuthority(TRUTH_CLASSES.ENTITY_CONTEXT)!;
  assert.strictEqual(a.coPrimaryDisagreement.type, 'preserve_contradiction');
});
test('derivatives disagreement = authority_wins', () => {
  const a = getClassAuthority(TRUTH_CLASSES.DERIVATIVES_PRESSURE)!;
  assert.strictEqual(a.coPrimaryDisagreement.type, 'authority_wins');
});
test('reasoning disagreement = fresher_wins', () => {
  const a = getClassAuthority(TRUTH_CLASSES.REASONING_EXPRESSION)!;
  assert.strictEqual(a.coPrimaryDisagreement.type, 'fresher_wins');
});

// ── Test 16: No-fallback lines ──────────────────────────────────────────────

console.log('\nTest 16: No-fallback lines');

for (const tc of ALL_CLASSES) {
  test(`${tc} has no-fallback line`, () => {
    const a = getClassAuthority(tc)!;
    assert(a.noFallbackLine.length > 20);
  });
}

// ── Test 17: Class resolution summary ───────────────────────────────────────

console.log('\nTest 17: Class resolution summary');

resetAllHealth();
recordSuccess('coingecko', 100);
recordSuccess('coinmarketcap', 100);

test('market_surface class resolution summary', () => {
  const r = resolveClassAuthority(TRUTH_CLASSES.MARKET_SURFACE);
  assert(r.summary.totalFields >= 3);
  assert.strictEqual(r.summary.suppressed, 0);
  assert(r.summary.healthy);
});

// ── Summary ──────────────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════════');
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════════════════\n');

if (failed > 0) process.exit(1);
