import assert from 'assert';
import { TRUTH_CLASSES } from '../services/source-systems/registry';
import {
  SUBSTITUTION_CONSTITUTION, getSubstitutionRule, getAllSubstitutionRules,
  isSubstitutionLegal, isSubstitutionIllegal,
} from '../services/source-systems/classes/substitution-constitution';
import {
  resolveSubstitution, validateSubstitutionAttempt,
  resolveAllSubstitutions, getIncidents, clearIncidents,
} from '../services/source-systems/classes/substitution-engine';
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
console.log('  L1.3 SUBSTITUTION MATRIX — FULL TEST SUITE');
console.log('══════════════════════════════════════════════════\n');

resetAllHealth();
clearIncidents();

// ── Test 1: Constitution completeness ────────────────────────────────────────

console.log('Test 1: Constitution completeness');

const allRules = getAllSubstitutionRules();
test(`${allRules.length} field substitution rules defined (>= 26)`, () => {
  assert(allRules.length >= 26, `Only ${allRules.length} rules`);
});

for (const rule of allRules) {
  test(`rule for ${rule.fieldId} has required fields`, () => {
    assert(rule.primaryOwner, `No primary owner for ${rule.fieldId}`);
    assert(rule.noFallbackCondition.length > 10, `No fallback condition for ${rule.fieldId}`);
    assert(rule.freshnessToleranceMs > 0, `No freshness tolerance for ${rule.fieldId}`);
    assert(rule.disclosureTemplate.length > 5, `No disclosure template for ${rule.fieldId}`);
    assert(rule.downstreamBlockers.length > 0, `No downstream blockers for ${rule.fieldId}`);
  });
}

// ── Test 2: Legal substitution checks ────────────────────────────────────────

console.log('\nTest 2: Legal substitution checks');

test('coinmarketcap is legal for price.spot.canonical', () => {
  assert(isSubstitutionLegal('price.spot.canonical', 'coinmarketcap'));
});
test('coingecko is legal for price.spot.canonical (owner)', () => {
  assert(isSubstitutionLegal('price.spot.canonical', 'coingecko'));
});
test('dexscreener is legal for dex.pool.liquidity', () => {
  assert(isSubstitutionLegal('dex.pool.liquidity', 'dexscreener'));
});
test('nansen is legal for entity.wallet.labels (co-authority)', () => {
  assert(isSubstitutionLegal('entity.wallet.labels', 'nansen'));
});
test('twitter_api is legal for narrative.social.velocity', () => {
  assert(isSubstitutionLegal('narrative.social.velocity', 'twitter_api'));
});
test('etherscan is legal for onchain.transfers.evm', () => {
  assert(isSubstitutionLegal('onchain.transfers.evm', 'etherscan'));
});

// ── Test 3: Illegal substitution checks ──────────────────────────────────────

console.log('\nTest 3: Illegal substitution checks');

test('dexscreener is ILLEGAL for price.spot.canonical', () => {
  const r = isSubstitutionIllegal('price.spot.canonical', 'dexscreener');
  assert(r.illegal);
  assert(r.reason!.includes('Discovery'));
});
test('openai is ILLEGAL for price.spot.canonical', () => {
  assert(isSubstitutionIllegal('price.spot.canonical', 'openai').illegal);
});
test('coingecko is ILLEGAL for dex.pool.liquidity', () => {
  assert(isSubstitutionIllegal('dex.pool.liquidity', 'coingecko').illegal);
});
test('lunarcrush is ILLEGAL for dex.pool.liquidity', () => {
  assert(isSubstitutionIllegal('dex.pool.liquidity', 'lunarcrush').illegal);
});
test('coingecko is ILLEGAL for derivatives.oi.aggregate', () => {
  assert(isSubstitutionIllegal('derivatives.oi.aggregate', 'coingecko').illegal);
});
test('openai is ILLEGAL for protocol.tvl.usd', () => {
  assert(isSubstitutionIllegal('protocol.tvl.usd', 'openai').illegal);
});
test('arkham is ILLEGAL for onchain.transfers.evm', () => {
  assert(isSubstitutionIllegal('onchain.transfers.evm', 'arkham').illegal);
});
test('openai is ILLEGAL for security.token.flags', () => {
  assert(isSubstitutionIllegal('security.token.flags', 'openai').illegal);
});
test('lunarcrush is ILLEGAL for narrative.news.velocity', () => {
  assert(isSubstitutionIllegal('narrative.news.velocity', 'lunarcrush').illegal);
});
test('alchemy is ILLEGAL for entity.wallet.labels', () => {
  assert(isSubstitutionIllegal('entity.wallet.labels', 'alchemy').illegal);
});

// ── Test 4: Resolution — healthy primary ─────────────────────────────────────

console.log('\nTest 4: Resolution — healthy primary');

resetAllHealth();
recordSuccess('coingecko', 100);
recordSuccess('coinglass', 80);
recordSuccess('defillama', 100);

test('price.spot.canonical resolves to USE_PRIMARY', () => {
  const r = resolveSubstitution('price.spot.canonical');
  assert.strictEqual(r.outcome, 'USE_PRIMARY');
  assert.strictEqual(r.selectedProvider, 'coingecko');
  assert.strictEqual(r.confidencePenalty, 0);
});
test('derivatives.oi.aggregate resolves to USE_PRIMARY', () => {
  const r = resolveSubstitution('derivatives.oi.aggregate');
  assert.strictEqual(r.outcome, 'USE_PRIMARY');
  assert.strictEqual(r.selectedProvider, 'coinglass');
});

// ── Test 5: Resolution — legal full fallback ─────────────────────────────────

console.log('\nTest 5: Resolution — legal full fallback');

resetAllHealth();
for (let i = 0; i < 6; i++) recordFailure('coingecko');
recordSuccess('coinmarketcap', 90);

test('price.spot.canonical falls to coinmarketcap at S0', () => {
  const r = resolveSubstitution('price.spot.canonical');
  assert.strictEqual(r.outcome, 'USE_SUBSTITUTE_FULL');
  assert.strictEqual(r.selectedProvider, 'coinmarketcap');
  assert.strictEqual(r.semanticLoss, 'S0_full_equivalent');
  assert(r.confidencePenalty > 0 && r.confidencePenalty <= 0.05);
});

// ── Test 6: Resolution — legal degraded fallback ─────────────────────────────

console.log('\nTest 6: Resolution — legal degraded fallback');

resetAllHealth();
for (let i = 0; i < 6; i++) recordFailure('alchemy');
recordSuccess('etherscan', 100);

test('onchain.transfers.evm falls to etherscan at S2', () => {
  const r = resolveSubstitution('onchain.transfers.evm');
  assert.strictEqual(r.outcome, 'USE_SUBSTITUTE_DEGRADED');
  assert.strictEqual(r.selectedProvider, 'etherscan');
  assert.strictEqual(r.semanticLoss, 'S2_degraded_equivalent');
  assert(r.confidencePenalty >= 0.12);
});

// ── Test 7: Resolution — partial view only ───────────────────────────────────

console.log('\nTest 7: Resolution — partial view only');

resetAllHealth();
for (let i = 0; i < 6; i++) recordFailure('alchemy');
for (let i = 0; i < 6; i++) recordFailure('etherscan');
recordSuccess('arkham', 80);

test('onchain.whale.flows falls to arkham at S3 (partial)', () => {
  const r = resolveSubstitution('onchain.whale.flows');
  assert.strictEqual(r.outcome, 'PARTIAL_VIEW_ONLY');
  assert.strictEqual(r.selectedProvider, 'arkham');
  assert.strictEqual(r.semanticLoss, 'S3_partial_view_only');
  assert(r.downstreamBlocked.length > 0, 'Must block downstream claims');
});

// ── Test 8: Resolution — no-fallback (suppress claim) ────────────────────────

console.log('\nTest 8: Resolution — no-fallback');

resetAllHealth();
for (let i = 0; i < 6; i++) recordFailure('coinglass');

test('derivatives.oi.aggregate suppressed (no legal substitutes)', () => {
  const r = resolveSubstitution('derivatives.oi.aggregate');
  assert.strictEqual(r.outcome, 'SUPPRESS_CLAIM');
  assert.strictEqual(r.selectedProvider, null);
  assert.strictEqual(r.confidencePenalty, 1.0);
  assert(r.downstreamBlocked.length > 0);
});

test('derivatives.funding.aggregate suppressed', () => {
  const r = resolveSubstitution('derivatives.funding.aggregate');
  assert.strictEqual(r.outcome, 'SUPPRESS_CLAIM');
});

test('protocol.tvl.usd suppressed when defillama down', () => {
  for (let i = 0; i < 6; i++) recordFailure('defillama');
  const r = resolveSubstitution('protocol.tvl.usd');
  assert.strictEqual(r.outcome, 'SUPPRESS_CLAIM');
});

// ── Test 9: Validate illegal substitution attempt + incident ─────────────────

console.log('\nTest 9: Illegal substitution attempt + incident logging');

clearIncidents();

test('openai attempting price.spot.canonical → ILLEGAL + incident', () => {
  const r = validateSubstitutionAttempt('price.spot.canonical', 'openai');
  assert.strictEqual(r.outcome, 'ILLEGAL_SUBSTITUTION_BLOCKED');
  assert.strictEqual(r.semanticLoss, 'S5_illegal');
  const incidents = getIncidents();
  assert(incidents.length >= 1);
  assert(incidents.some(i => i.attemptedProvider === 'openai' && i.fieldId === 'price.spot.canonical'));
});

test('lunarcrush attempting derivatives.oi.aggregate → ILLEGAL + incident', () => {
  const r = validateSubstitutionAttempt('derivatives.oi.aggregate', 'lunarcrush');
  assert.strictEqual(r.outcome, 'ILLEGAL_SUBSTITUTION_BLOCKED');
});

test('arkham attempting onchain.transfers.evm → ILLEGAL + incident', () => {
  const r = validateSubstitutionAttempt('onchain.transfers.evm', 'arkham');
  assert.strictEqual(r.outcome, 'ILLEGAL_SUBSTITUTION_BLOCKED');
});

test('dexscreener attempting security.token.flags → ILLEGAL + incident', () => {
  const r = validateSubstitutionAttempt('security.token.flags', 'dexscreener');
  assert.strictEqual(r.outcome, 'ILLEGAL_SUBSTITUTION_BLOCKED');
});

test('incidents logged correctly', () => {
  const incidents = getIncidents();
  assert(incidents.length >= 4, `Expected >= 4 incidents, got ${incidents.length}`);
  assert(incidents.every(i => i.timestamp && i.fieldId && i.attemptedProvider && i.reason));
});

// ── Test 10: Validate legal substitution attempt ─────────────────────────────

console.log('\nTest 10: Validate legal substitution attempt');

test('coinmarketcap as substitute for price.spot.canonical → legal', () => {
  const r = validateSubstitutionAttempt('price.spot.canonical', 'coinmarketcap');
  assert(r.outcome === 'USE_SUBSTITUTE_FULL' || r.outcome === 'USE_SUBSTITUTE_DEGRADED');
  assert(r.confidencePenalty <= 0.05);
});

test('coingecko as owner for price.spot.canonical → USE_PRIMARY', () => {
  const r = validateSubstitutionAttempt('price.spot.canonical', 'coingecko');
  assert.strictEqual(r.outcome, 'USE_PRIMARY');
});

// ── Test 11: Unenumerated provider → blocked ─────────────────────────────────

console.log('\nTest 11: Unenumerated provider');

test('defillama attempting price.spot.canonical → blocked (not enumerated)', () => {
  const r = validateSubstitutionAttempt('price.spot.canonical', 'defillama');
  assert.strictEqual(r.outcome, 'ILLEGAL_SUBSTITUTION_BLOCKED');
});

// ── Test 12: Semantic loss ladder values ─────────────────────────────────────

console.log('\nTest 12: Semantic loss ladder');

test('coinmarketcap → price.spot.canonical is S0', () => {
  const rule = getSubstitutionRule('price.spot.canonical')!;
  const candidate = rule.legalSubstitutes.find(s => s.providerId === 'coinmarketcap')!;
  assert.strictEqual(candidate.semanticLoss, 'S0_full_equivalent');
});

test('dexscreener → dex.pool.liquidity is S1', () => {
  const rule = getSubstitutionRule('dex.pool.liquidity')!;
  const candidate = rule.legalSubstitutes.find(s => s.providerId === 'dexscreener')!;
  assert.strictEqual(candidate.semanticLoss, 'S1_near_equivalent');
});

test('etherscan → onchain.transfers.evm is S2', () => {
  const rule = getSubstitutionRule('onchain.transfers.evm')!;
  const candidate = rule.legalSubstitutes.find(s => s.providerId === 'etherscan')!;
  assert.strictEqual(candidate.semanticLoss, 'S2_degraded_equivalent');
});

test('arkham → onchain.whale.flows is S3', () => {
  const rule = getSubstitutionRule('onchain.whale.flows')!;
  const candidate = rule.legalSubstitutes.find(s => s.providerId === 'arkham')!;
  assert.strictEqual(candidate.semanticLoss, 'S3_partial_view_only');
});

// ── Test 13: Full system resolution ──────────────────────────────────────────

console.log('\nTest 13: Full system resolution');

resetAllHealth();
clearIncidents();
recordSuccess('coingecko', 100); recordSuccess('coinmarketcap', 90);
recordSuccess('coinglass', 80); recordSuccess('defillama', 100);
recordSuccess('alchemy', 50); recordSuccess('quicknode', 50);
recordSuccess('goplus', 100); recordSuccess('geckoterminal', 80);
recordSuccess('dexscreener', 80); recordSuccess('cryptopanic', 100);
recordSuccess('lunarcrush', 90); recordSuccess('twitter_api', 80);
recordSuccess('arkham', 100); recordSuccess('nansen', 80);
recordSuccess('etherscan', 80); recordSuccess('solscan', 80);

test('full resolution covers all fields', () => {
  const d = resolveAllSubstitutions();
  assert.strictEqual(d.totalFields, allRules.length);
});

test('full resolution with healthy providers = mostly primary', () => {
  const d = resolveAllSubstitutions();
  assert(d.primaryUsed >= 20, `Expected >= 20 primary, got ${d.primaryUsed}`);
  assert.strictEqual(d.illegalBlocked, 0);
});

// ── Test 14: Disclosure templates ────────────────────────────────────────────

console.log('\nTest 14: Disclosure templates');

for (const rule of allRules) {
  test(`disclosure template exists for ${rule.fieldId}`, () => {
    assert(rule.disclosureTemplate.length > 5);
  });
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log('\n══════════════════════════════════════════════════');
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log('══════════════════════════════════════════════════\n');

if (failed > 0) process.exit(1);
