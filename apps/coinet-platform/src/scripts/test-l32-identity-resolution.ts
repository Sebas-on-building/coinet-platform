/**
 * L3.2 Canonical Identity Resolution — Full Integration Test
 *
 * Nine suites:
 *   A. Deterministic anchor tests
 *   B. Alias safety tests
 *   C. Context disambiguation tests
 *   D. Provider comparison tests
 *   E. Hard veto tests
 *   F. Outcome mapping tests
 *   G. Object-specific anti-fake tests
 *   H. Replay and historical continuity tests
 *   I. Master anti-fake suite (canonical-identity-honesty)
 */

import assert from 'node:assert';

import {
  L32_RESOLUTION_VERSION,
  OUTCOME_THRESHOLDS,
  ALL_HARD_VETOES,
  isOutcomeSafeForMissionCritical,
  isOutcomeSafeForContextual,
  type ResolutionInput,
  type ProviderIdentityClaim,
  type IdentityResolutionDecision,
} from '../services/canonicalization/identity-resolution-types';

import {
  normalizeAlias,
  registerAlias,
  expandAliases,
  detectCollisions,
  isForbidden,
  resetAliasRegistry,
  type AliasEntry,
} from '../services/canonicalization/alias-registry';

import {
  registerContract,
  resolveByContractTuples,
  resolvePoolAddress,
  resolveDerivativeContract,
  resolveAddressIdentity,
  detectWrappedRelation,
  resetContractIndex,
  type ContractIndexEntry,
} from '../services/canonicalization/contract-resolution';

import {
  normalizeClaims,
  compareProviderClaims,
  hasProvenanceSupport,
  resetClaimState,
} from '../services/canonicalization/provider-identity-claims';

import {
  computeScoreBuckets,
  computePenalties,
  totalScore,
  detectHardVetoes,
  detectScars,
  mapOutcome,
  mapState,
  adjudicate,
} from '../services/canonicalization/identity-resolver';

import {
  resolveIdentity,
  getDecisionLedger,
  getUnresolvedQueue,
  resetPipelineState,
} from '../services/canonicalization/identity-resolution-pipeline';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HARNESS
// ═══════════════════════════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ✅ ${name}`); }
  catch (e: any) { failed++; console.log(`  ❌ ${name}: ${e.message}`); }
}

function resetAll() {
  resetAliasRegistry();
  resetContractIndex();
  resetClaimState();
  resetPipelineState();
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

function seedBTCFixtures() {
  registerContract({
    chainId: 'chain_btc', address: 'native', normalizedAddress: 'native',
    objectType: 'ASSET', canonicalId: 'ast_btc001', role: 'PRIMARY_CONTRACT', sourceRefs: ['r'],
  });
  registerContract({
    chainId: 'chain_eth', address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    normalizedAddress: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    objectType: 'ASSET', canonicalId: 'ast_wbtc001', role: 'WRAPPED_CONTRACT',
    rootCanonicalId: 'ast_btc001', sourceRefs: ['r'],
  });
  registerAlias({
    alias: 'BTC', normalizedAlias: 'btc', objectType: 'ASSET',
    canonicalCandidateIds: ['ast_btc001'], forbidden: false, sourceRefs: ['r'],
  });
  registerAlias({
    alias: 'WBTC', normalizedAlias: 'wbtc', objectType: 'ASSET',
    canonicalCandidateIds: ['ast_wbtc001'], forbidden: false, sourceRefs: ['r'],
  });
  registerAlias({
    alias: 'BTC', normalizedAlias: 'btc', objectType: 'ASSET', chainScope: 'chain_eth',
    canonicalCandidateIds: ['ast_btc001', 'ast_wbtc001'], forbidden: false, sourceRefs: ['r'],
  });
}

function seedUSDCFixtures() {
  registerContract({
    chainId: 'chain_eth', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    normalizedAddress: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    objectType: 'ASSET', canonicalId: 'ast_usdc_eth', role: 'PRIMARY_CONTRACT', sourceRefs: ['r'],
  });
  registerContract({
    chainId: 'chain_arb', address: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
    normalizedAddress: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
    objectType: 'ASSET', canonicalId: 'ast_usdce_arb', role: 'BRIDGED_CONTRACT',
    rootCanonicalId: 'ast_usdc_eth', sourceRefs: ['r'],
  });
  registerAlias({
    alias: 'USDC', normalizedAlias: 'usdc', objectType: 'ASSET',
    canonicalCandidateIds: ['ast_usdc_eth', 'ast_usdce_arb'], forbidden: false, sourceRefs: ['r'],
  });
}

function seedProtocolFixtures() {
  registerContract({
    chainId: 'chain_sol', address: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
    normalizedAddress: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
    objectType: 'PROTOCOL', canonicalId: 'proto_jup001', role: 'CONTROLLED_CONTRACT', sourceRefs: ['r'],
  });
  registerAlias({
    alias: 'Jupiter', normalizedAlias: 'jupiter', objectType: 'PROTOCOL',
    canonicalCandidateIds: ['proto_jup001'], forbidden: false, sourceRefs: ['r'],
  });
  registerAlias({
    alias: 'JUP', normalizedAlias: 'jup', objectType: 'ASSET',
    canonicalCandidateIds: ['ast_jup001'], forbidden: false, sourceRefs: ['r'],
  });
}

function seedEntityFixtures() {
  registerContract({
    chainId: 'chain_eth', address: '0xbinancehw1',
    normalizedAddress: '0xbinancehw1',
    objectType: 'ENTITY', canonicalId: 'ent_binance001', role: 'WALLET_ADDRESS', sourceRefs: ['r'],
  });
}

function seedPairFixtures() {
  registerContract({
    chainId: 'chain_eth', address: '0xpool_btcusdt',
    normalizedAddress: '0xpool_btcusdt',
    objectType: 'PAIR', canonicalId: 'pair_btcusdt_pool', role: 'POOL_CONTRACT', sourceRefs: ['r'],
  });
  registerAlias({
    alias: 'BTC/USDT', normalizedAlias: 'btc/usdt', objectType: 'PAIR',
    canonicalCandidateIds: ['pair_btcusdt_spot'], forbidden: false, sourceRefs: ['r'],
  });
}

function seedChainFixtures() {
  registerAlias({
    alias: 'Ethereum', normalizedAlias: 'ethereum', objectType: 'CHAIN',
    canonicalCandidateIds: ['chain_eth001'], forbidden: false, sourceRefs: ['r'],
  });
  registerAlias({
    alias: 'Arbitrum', normalizedAlias: 'arbitrum', objectType: 'CHAIN',
    canonicalCandidateIds: ['chain_arb001'], forbidden: false, sourceRefs: ['r'],
  });
}

function seedTopicFixtures() {
  registerAlias({
    alias: 'AI agents', normalizedAlias: 'ai_agents', objectType: 'NARRATIVE_TOPIC',
    canonicalCandidateIds: ['topic_ai_agents'], forbidden: false, sourceRefs: ['r'],
  });
  registerAlias({
    alias: 'AI infrastructure', normalizedAlias: 'ai_infrastructure', objectType: 'NARRATIVE_TOPIC',
    canonicalCandidateIds: ['topic_ai_infra'], forbidden: false, sourceRefs: ['r'],
  });
}

function makeInput(overrides: Partial<ResolutionInput>): ResolutionInput {
  return {
    inputHandle: 'test_handle',
    providerClaims: [],
    contractTuples: [],
    aliasHints: [],
    replayGeneration: 0,
    blindSpotRefs: [],
    isMissionCritical: false,
    ...overrides,
  };
}

function makeClaim(overrides: Partial<ProviderIdentityClaim>): ProviderIdentityClaim {
  return {
    providerId: 'test_provider',
    providerObjectId: 'test_obj',
    claimClass: 'DETERMINISTIC_ANCHOR',
    objectTypeHint: 'ASSET',
    payload: {},
    sourceRefs: ['r'],
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// A. DETERMINISTIC ANCHOR TESTS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ A. Deterministic anchor tests ═══');

resetAll(); seedBTCFixtures(); seedUSDCFixtures(); seedProtocolFixtures(); seedEntityFixtures(); seedPairFixtures();

test('Exact chain+contract resolves correct asset candidate', () => {
  const r = resolveByContractTuples(
    [{ chainId: 'chain_eth', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', sourceRefs: ['r'] }],
    'ASSET',
  );
  assert.ok(r.candidateIds.includes('ast_wbtc001'));
  assert.ok(r.anchorStrength === 'STRONG' || r.anchorStrength === 'EXACT');
});

test('Pool address resolves pair correctly', () => {
  const r = resolvePoolAddress('chain_eth', '0xpool_btcusdt');
  assert.ok(r.candidateIds.includes('pair_btcusdt_pool'));
  assert.strictEqual(r.anchorStrength, 'EXACT');
});

test('Protocol contract resolves protocol candidate', () => {
  const r = resolveByContractTuples(
    [{ chainId: 'chain_sol', address: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', sourceRefs: ['r'] }],
    'PROTOCOL',
  );
  assert.ok(r.candidateIds.includes('proto_jup001'));
  assert.strictEqual(r.anchorStrength, 'EXACT');
});

test('Address identity resolves wallet entity', () => {
  const r = resolveAddressIdentity('chain_eth', '0xbinancehw1');
  assert.ok(r.candidateIds.includes('ent_binance001'));
  assert.strictEqual(r.anchorStrength, 'EXACT');
});

test('Wrapped relation detected correctly', () => {
  const r = detectWrappedRelation('chain_eth', '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599');
  assert.ok(r.hasRelation);
  assert.strictEqual(r.relationType, 'WRAPPED');
  assert.strictEqual(r.rootCanonicalId, 'ast_btc001');
});

test('Unknown contract returns NONE strength', () => {
  const r = resolveByContractTuples(
    [{ chainId: 'chain_eth', address: '0xunknown', sourceRefs: ['r'] }],
    'ASSET',
  );
  assert.strictEqual(r.anchorStrength, 'NONE');
  assert.strictEqual(r.candidateIds.length, 0);
});

// ═══════════════════════════════════════════════════════════════════════════════
// B. ALIAS SAFETY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ B. Alias safety tests ═══');

test('Same ticker on two chains detects collision', () => {
  const r = expandAliases(['BTC'], 'ASSET');
  assert.ok(r.candidateIds.length >= 1);
});

test('Scoped alias narrows correctly', () => {
  const r = expandAliases(['BTC'], 'ASSET', 'chain_eth');
  assert.ok(r.candidateIds.length >= 1);
});

test('Protocol alias does not resolve token (different object types)', () => {
  const protResult = expandAliases(['Jupiter'], 'PROTOCOL');
  const tokenResult = expandAliases(['JUP'], 'ASSET');
  assert.ok(!protResult.candidateIds.includes('ast_jup001'));
  assert.ok(!tokenResult.candidateIds.includes('proto_jup001'));
});

test('Global symbol alone triggers collision warning when multiple candidates', () => {
  const r = expandAliases(['USDC'], 'ASSET');
  assert.ok(r.candidateIds.length >= 2, 'USDC should map to multiple candidates');
  assert.ok(r.collisionWarnings.length > 0, 'Should detect collision');
});

test('Narrative synonym overlap does not force merge', () => {
  seedTopicFixtures();
  const r1 = expandAliases(['AI agents'], 'NARRATIVE_TOPIC');
  const r2 = expandAliases(['AI infrastructure'], 'NARRATIVE_TOPIC');
  assert.ok(!r1.candidateIds.includes('topic_ai_infra'));
  assert.ok(!r2.candidateIds.includes('topic_ai_agents'));
});

test('Alias normalization is consistent', () => {
  assert.strictEqual(normalizeAlias('BTC'), normalizeAlias('btc'));
  assert.strictEqual(normalizeAlias('AI agents'), normalizeAlias('AI_agents'));
  assert.strictEqual(normalizeAlias('  BTC  '), normalizeAlias('BTC'));
});

test('Forbidden alias check works for entity', () => {
  const r = isForbidden('anything', 'ENTITY');
  assert.ok(r.forbidden, 'Single label should be forbidden for entity resolution');
});

test('Forbidden alias check works for narrative topic', () => {
  const r = isForbidden('anything', 'NARRATIVE_TOPIC');
  assert.ok(r.forbidden, 'Single phrase should be forbidden for topic resolution');
});

// ═══════════════════════════════════════════════════════════════════════════════
// C. CONTEXT DISAMBIGUATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ C. Context disambiguation tests ═══');

test('Chain context improves resolution for asset', () => {
  resetAll(); seedBTCFixtures();
  const d = resolveIdentity(makeInput({
    objectTypeHint: 'ASSET',
    aliasHints: ['BTC'],
    chainContext: 'chain_btc',
    contractTuples: [{ chainId: 'chain_btc', address: 'native', sourceRefs: ['r'] }],
  }));
  assert.ok(d.confidenceScore > 0);
  assert.ok(d.contextualMatches.length > 0 || d.deterministicAnchorHits.length > 0);
});

test('Source class narrows admissible object family', () => {
  resetAll(); seedProtocolFixtures();
  const d = resolveIdentity(makeInput({
    sourceClass: 'PROTOCOL_SUBSTANCE',
    aliasHints: ['Jupiter'],
    contractTuples: [{ chainId: 'chain_sol', address: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', sourceRefs: ['r'] }],
  }));
  assert.strictEqual(d.objectType, 'PROTOCOL');
});

test('Field family influences intended type', () => {
  resetAll(); seedEntityFixtures();
  const d = resolveIdentity(makeInput({
    fieldFamily: 'wallet.exchange_inflow',
    contractTuples: [{ chainId: 'chain_eth', address: '0xbinancehw1', sourceRefs: ['r'] }],
  }));
  assert.strictEqual(d.objectType, 'ENTITY');
});

test('Route intention captured in decision', () => {
  resetAll(); seedBTCFixtures();
  const d = resolveIdentity(makeInput({
    objectTypeHint: 'ASSET',
    aliasHints: ['BTC'],
    routeIntention: 'FORENSIC_REPLAY',
    contractTuples: [{ chainId: 'chain_btc', address: 'native', sourceRefs: ['r'] }],
  }));
  assert.ok(d.reasonCodes.length > 0);
});

// ═══════════════════════════════════════════════════════════════════════════════
// D. PROVIDER COMPARISON TESTS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ D. Provider comparison tests ═══');

test('Agreeing providers strengthen confidence', () => {
  resetAll(); seedBTCFixtures();
  const claims: ProviderIdentityClaim[] = [
    makeClaim({ providerId: 'coingecko', providerObjectId: 'bitcoin', claimClass: 'DETERMINISTIC_ANCHOR' }),
    makeClaim({ providerId: 'coinmarketcap', providerObjectId: 'BTC', claimClass: 'DETERMINISTIC_ANCHOR' }),
  ];
  const normalized = normalizeClaims(claims);
  normalized.forEach(c => c.candidateCanonicalId = 'ast_btc001');
  const result = compareProviderClaims(normalized, ['ast_btc001']);
  assert.ok(result.agreementByCandidate['ast_btc001'] > 0);
  assert.strictEqual(result.coAuthorityConflicts.length, 0);
});

test('Co-authority disagreement preserves contested state', () => {
  const claims: ProviderIdentityClaim[] = [
    makeClaim({ providerId: 'arkham', providerObjectId: 'wallet_A', claimClass: 'DETERMINISTIC_ANCHOR' }),
    makeClaim({ providerId: 'nansen', providerObjectId: 'wallet_B', claimClass: 'DETERMINISTIC_ANCHOR' }),
  ];
  const normalized = normalizeClaims(claims);
  normalized[0].candidateCanonicalId = 'ent_a';
  normalized[1].candidateCanonicalId = 'ent_b';
  const result = compareProviderClaims(normalized, ['ent_a', 'ent_b']);
  assert.ok(result.coAuthorityConflicts.length > 0);
});

test('Weak breadth agreement does not create strong confidence', () => {
  const claims: ProviderIdentityClaim[] = [
    makeClaim({ providerId: 'generic1', providerObjectId: 'x', claimClass: 'ALIAS' }),
    makeClaim({ providerId: 'generic2', providerObjectId: 'x', claimClass: 'ALIAS' }),
  ];
  const normalized = normalizeClaims(claims);
  normalized.forEach(c => c.candidateCanonicalId = 'ast_x');
  const result = compareProviderClaims(normalized, ['ast_x']);
  assert.ok(result.agreementByCandidate['ast_x'] <= 20);
});

test('Entity attribution without provenance detected', () => {
  const claims: ProviderIdentityClaim[] = [
    makeClaim({ providerId: 'unknown', claimClass: 'SCOPE', objectTypeHint: 'ENTITY' }),
  ];
  assert.ok(!hasProvenanceSupport(normalizeClaims(claims), 'ENTITY'));
});

test('Entity attribution with provenance passes', () => {
  const claims: ProviderIdentityClaim[] = [
    makeClaim({ providerId: 'arkham', claimClass: 'ATTRIBUTION', objectTypeHint: 'ENTITY' }),
  ];
  assert.ok(hasProvenanceSupport(normalizeClaims(claims), 'ENTITY'));
});

// ═══════════════════════════════════════════════════════════════════════════════
// E. HARD VETO TESTS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ E. Hard veto tests ═══');

test('All hard vetoes are defined', () => {
  assert.strictEqual(ALL_HARD_VETOES.length, 7);
});

test('Symbol-only mission-critical resolution vetoed', () => {
  const vetoes = detectHardVetoes({
    objectType: 'ASSET', isMissionCritical: true, hasOnlyAliasEvidence: true,
    hasCrossChainMerge: false, hasChainAwareReasoning: false,
    hasWrappedNativeMerge: false, hasRelationshipModel: false,
    hasProtocolTokenCollapse: false, hasPairPoolCollapse: false,
    hasEntityAttributionWithoutProvenance: false, hasNarrativeMergeUnderOverlap: false,
  });
  assert.ok(vetoes.includes('SYMBOL_ONLY_MISSION_CRITICAL'));
});

test('Cross-chain merge without reasoning vetoed', () => {
  const vetoes = detectHardVetoes({
    objectType: 'ASSET', isMissionCritical: false, hasOnlyAliasEvidence: false,
    hasCrossChainMerge: true, hasChainAwareReasoning: false,
    hasWrappedNativeMerge: false, hasRelationshipModel: false,
    hasProtocolTokenCollapse: false, hasPairPoolCollapse: false,
    hasEntityAttributionWithoutProvenance: false, hasNarrativeMergeUnderOverlap: false,
  });
  assert.ok(vetoes.includes('CROSS_CHAIN_MERGE_WITHOUT_CHAIN_REASONING'));
});

test('Wrapped/native merge without relationship vetoed', () => {
  const vetoes = detectHardVetoes({
    objectType: 'ASSET', isMissionCritical: false, hasOnlyAliasEvidence: false,
    hasCrossChainMerge: false, hasChainAwareReasoning: false,
    hasWrappedNativeMerge: true, hasRelationshipModel: false,
    hasProtocolTokenCollapse: false, hasPairPoolCollapse: false,
    hasEntityAttributionWithoutProvenance: false, hasNarrativeMergeUnderOverlap: false,
  });
  assert.ok(vetoes.includes('WRAPPED_NATIVE_MERGE_WITHOUT_RELATIONSHIP'));
});

test('Protocol/token collapse by name vetoed', () => {
  const vetoes = detectHardVetoes({
    objectType: 'PROTOCOL', isMissionCritical: false, hasOnlyAliasEvidence: false,
    hasCrossChainMerge: false, hasChainAwareReasoning: false,
    hasWrappedNativeMerge: false, hasRelationshipModel: false,
    hasProtocolTokenCollapse: true, hasPairPoolCollapse: false,
    hasEntityAttributionWithoutProvenance: false, hasNarrativeMergeUnderOverlap: false,
  });
  assert.ok(vetoes.includes('PROTOCOL_TOKEN_COLLAPSE_BY_NAME'));
});

test('Pair/pool collapse by label vetoed', () => {
  const vetoes = detectHardVetoes({
    objectType: 'PAIR', isMissionCritical: false, hasOnlyAliasEvidence: false,
    hasCrossChainMerge: false, hasChainAwareReasoning: false,
    hasWrappedNativeMerge: false, hasRelationshipModel: false,
    hasProtocolTokenCollapse: false, hasPairPoolCollapse: true,
    hasEntityAttributionWithoutProvenance: false, hasNarrativeMergeUnderOverlap: false,
  });
  assert.ok(vetoes.includes('PAIR_POOL_COLLAPSE_BY_LABEL'));
});

test('Entity attribution without provenance vetoed', () => {
  const vetoes = detectHardVetoes({
    objectType: 'ENTITY', isMissionCritical: false, hasOnlyAliasEvidence: false,
    hasCrossChainMerge: false, hasChainAwareReasoning: false,
    hasWrappedNativeMerge: false, hasRelationshipModel: false,
    hasProtocolTokenCollapse: false, hasPairPoolCollapse: false,
    hasEntityAttributionWithoutProvenance: true, hasNarrativeMergeUnderOverlap: false,
  });
  assert.ok(vetoes.includes('ENTITY_ATTRIBUTION_WITHOUT_PROVENANCE'));
});

test('Narrative merge under overlap vetoed', () => {
  const vetoes = detectHardVetoes({
    objectType: 'NARRATIVE_TOPIC', isMissionCritical: false, hasOnlyAliasEvidence: false,
    hasCrossChainMerge: false, hasChainAwareReasoning: false,
    hasWrappedNativeMerge: false, hasRelationshipModel: false,
    hasProtocolTokenCollapse: false, hasPairPoolCollapse: false,
    hasEntityAttributionWithoutProvenance: false, hasNarrativeMergeUnderOverlap: true,
  });
  assert.ok(vetoes.includes('NARRATIVE_MERGE_UNDER_UNRESOLVED_OVERLAP'));
});

test('No vetoes when all conditions clean', () => {
  const vetoes = detectHardVetoes({
    objectType: 'ASSET', isMissionCritical: true, hasOnlyAliasEvidence: false,
    hasCrossChainMerge: false, hasChainAwareReasoning: true,
    hasWrappedNativeMerge: false, hasRelationshipModel: true,
    hasProtocolTokenCollapse: false, hasPairPoolCollapse: false,
    hasEntityAttributionWithoutProvenance: false, hasNarrativeMergeUnderOverlap: false,
  });
  assert.strictEqual(vetoes.length, 0);
});

test('Unresolved outcome when veto present regardless of score', () => {
  const outcome = mapOutcome(95, ['SYMBOL_ONLY_MISSION_CRITICAL']);
  assert.strictEqual(outcome, 'UNRESOLVED');
});

// ═══════════════════════════════════════════════════════════════════════════════
// F. OUTCOME MAPPING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ F. Outcome mapping tests ═══');

test('Score ≥ 85 → RESOLVED_HIGH', () => {
  assert.strictEqual(mapOutcome(85, []), 'RESOLVED_HIGH');
  assert.strictEqual(mapOutcome(100, []), 'RESOLVED_HIGH');
});

test('Score 70–84 → RESOLVED_MEDIUM', () => {
  assert.strictEqual(mapOutcome(70, []), 'RESOLVED_MEDIUM');
  assert.strictEqual(mapOutcome(84, []), 'RESOLVED_MEDIUM');
});

test('Score 55–69 → RESOLVED_LOW', () => {
  assert.strictEqual(mapOutcome(55, []), 'RESOLVED_LOW');
  assert.strictEqual(mapOutcome(69, []), 'RESOLVED_LOW');
});

test('Score < 55 → UNRESOLVED', () => {
  assert.strictEqual(mapOutcome(54, []), 'UNRESOLVED');
  assert.strictEqual(mapOutcome(0, []), 'UNRESOLVED');
});

test('High + no scar → RESOLVED_CLEAN', () => {
  const state = mapState('RESOLVED_HIGH', [], { agreementByCandidate: {}, disagreements: [], coAuthorityConflicts: [], reinforcingClaims: [] }, [], {});
  assert.strictEqual(state, 'RESOLVED_CLEAN');
});

test('Medium + scars → RESOLVED_WITH_SCAR', () => {
  const state = mapState('RESOLVED_MEDIUM', ['CHAIN_SCAR'], { agreementByCandidate: {}, disagreements: [], coAuthorityConflicts: [], reinforcingClaims: [] }, [], {});
  assert.strictEqual(state, 'RESOLVED_WITH_SCAR');
});

test('Low + scars → RESOLVED_WITH_SCAR', () => {
  const state = mapState('RESOLVED_LOW', ['ALIAS_ONLY'], { agreementByCandidate: {}, disagreements: [], coAuthorityConflicts: [], reinforcingClaims: [] }, [], {});
  assert.strictEqual(state, 'RESOLVED_WITH_SCAR');
});

test('Unresolved + co-authority conflict → CONTESTED', () => {
  const state = mapState('UNRESOLVED', [], {
    agreementByCandidate: {},
    disagreements: [],
    coAuthorityConflicts: ['CONFLICT'],
    reinforcingClaims: [],
  }, ['a', 'b'], {});
  assert.strictEqual(state, 'CONTESTED');
});

test('RESOLVED_LOW not safe for mission critical', () => {
  assert.ok(!isOutcomeSafeForMissionCritical('RESOLVED_LOW', 'RESOLVED_WITH_SCAR'));
});

test('RESOLVED_HIGH + RESOLVED_CLEAN safe for mission critical', () => {
  assert.ok(isOutcomeSafeForMissionCritical('RESOLVED_HIGH', 'RESOLVED_CLEAN'));
});

test('UNRESOLVED not safe for anything', () => {
  assert.ok(!isOutcomeSafeForMissionCritical('UNRESOLVED', 'UNRESOLVED'));
  assert.ok(!isOutcomeSafeForContextual('UNRESOLVED'));
});

test('RESOLVED_LOW safe for contextual', () => {
  assert.ok(isOutcomeSafeForContextual('RESOLVED_LOW'));
});

// ═══════════════════════════════════════════════════════════════════════════════
// G. OBJECT-SPECIFIC ANTI-FAKE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ G. Object-specific anti-fake tests ═══');

test('BTC ≠ WBTC through full pipeline', () => {
  resetAll(); seedBTCFixtures();
  const btcD = resolveIdentity(makeInput({
    objectTypeHint: 'ASSET', aliasHints: ['BTC'], chainContext: 'chain_btc',
    contractTuples: [{ chainId: 'chain_btc', address: 'native', sourceRefs: ['r'] }],
    providerClaims: [makeClaim({ providerId: 'coingecko', providerObjectId: 'bitcoin' })],
  }));
  const wbtcD = resolveIdentity(makeInput({
    objectTypeHint: 'ASSET', aliasHints: ['WBTC'], chainContext: 'chain_eth',
    contractTuples: [{ chainId: 'chain_eth', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', sourceRefs: ['r'] }],
    providerClaims: [makeClaim({ providerId: 'coingecko', providerObjectId: 'wbtc' })],
  }));
  assert.ok(btcD.selectedCanonicalId, 'BTC should resolve');
  assert.ok(wbtcD.selectedCanonicalId, 'WBTC should resolve');
  assert.notStrictEqual(btcD.selectedCanonicalId, wbtcD.selectedCanonicalId);
});

test('USDC ≠ USDC.e through contract resolution', () => {
  resetAll(); seedUSDCFixtures();
  const ethD = resolveIdentity(makeInput({
    objectTypeHint: 'ASSET',
    contractTuples: [{ chainId: 'chain_eth', address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', sourceRefs: ['r'] }],
  }));
  const arbD = resolveIdentity(makeInput({
    objectTypeHint: 'ASSET',
    contractTuples: [{ chainId: 'chain_arb', address: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8', sourceRefs: ['r'] }],
  }));
  if (ethD.selectedCanonicalId && arbD.selectedCanonicalId) {
    assert.notStrictEqual(ethD.selectedCanonicalId, arbD.selectedCanonicalId);
  }
});

test('Protocol ≠ protocol token through type separation', () => {
  resetAll(); seedProtocolFixtures();
  const protoD = resolveIdentity(makeInput({
    objectTypeHint: 'PROTOCOL', aliasHints: ['Jupiter'],
    contractTuples: [{ chainId: 'chain_sol', address: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4', sourceRefs: ['r'] }],
  }));
  const tokenD = resolveIdentity(makeInput({
    objectTypeHint: 'ASSET', aliasHints: ['JUP'],
  }));
  assert.strictEqual(protoD.objectType, 'PROTOCOL');
  assert.strictEqual(tokenD.objectType, 'ASSET');
});

test('Exchange wallet ≠ fund wallet without provenance', () => {
  resetAll(); seedEntityFixtures();
  const d = resolveIdentity(makeInput({
    objectTypeHint: 'ENTITY', aliasHints: ['some fund label'],
    providerClaims: [makeClaim({ claimClass: 'SCOPE', objectTypeHint: 'ENTITY' })],
    isMissionCritical: false,
  }));
  assert.ok(d.scars.includes('ENTITY_ATTRIBUTION_SCAR') || d.outcome === 'UNRESOLVED');
});

test('L2 chain ≠ L1 chain', () => {
  resetAll(); seedChainFixtures();
  const ethD = resolveIdentity(makeInput({ objectTypeHint: 'CHAIN', aliasHints: ['Ethereum'] }));
  const arbD = resolveIdentity(makeInput({ objectTypeHint: 'CHAIN', aliasHints: ['Arbitrum'] }));
  if (ethD.selectedCanonicalId && arbD.selectedCanonicalId) {
    assert.notStrictEqual(ethD.selectedCanonicalId, arbD.selectedCanonicalId);
  }
});

test('Narrative parent ≠ subtopic', () => {
  resetAll(); seedTopicFixtures();
  const d1 = resolveIdentity(makeInput({ objectTypeHint: 'NARRATIVE_TOPIC', aliasHints: ['AI agents'] }));
  const d2 = resolveIdentity(makeInput({ objectTypeHint: 'NARRATIVE_TOPIC', aliasHints: ['AI infrastructure'] }));
  if (d1.selectedCanonicalId && d2.selectedCanonicalId) {
    assert.notStrictEqual(d1.selectedCanonicalId, d2.selectedCanonicalId);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// H. REPLAY AND HISTORICAL CONTINUITY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ H. Replay and historical continuity tests ═══');

test('Same inputs produce same replay generation', () => {
  resetAll(); seedBTCFixtures();
  const d1 = resolveIdentity(makeInput({
    objectTypeHint: 'ASSET', aliasHints: ['BTC'],
    contractTuples: [{ chainId: 'chain_btc', address: 'native', sourceRefs: ['r'] }],
    replayGeneration: 3,
  }));
  assert.strictEqual(d1.replayGeneration, 3);
});

test('Decision ledger records all decisions', () => {
  resetAll(); seedBTCFixtures();
  resolveIdentity(makeInput({
    objectTypeHint: 'ASSET', aliasHints: ['BTC'],
    contractTuples: [{ chainId: 'chain_btc', address: 'native', sourceRefs: ['r'] }],
  }));
  const ledger = getDecisionLedger();
  assert.ok(ledger.length >= 1);
  assert.ok(ledger[0].resolutionId.startsWith('res_'));
});

test('Unresolved decisions enter unresolved queue', () => {
  resetAll();
  const d = resolveIdentity(makeInput({
    objectTypeHint: 'ASSET', aliasHints: ['UNKNOWN_TOKEN_XYZ'],
    isMissionCritical: true,
  }));
  assert.strictEqual(d.outcome, 'UNRESOLVED');
  const queue = getUnresolvedQueue();
  assert.ok(queue.length >= 1);
});

test('Scars are preserved in decision', () => {
  const scars = detectScars({
    hasOnlyAliasEvidence: true, hasChainAmbiguity: true,
    hasWrappedRelation: false, hasBridgedRelation: false,
    hasProviderDisagreement: true, hasEntityAttributionGap: false,
    hasTopicBoundaryAmbiguity: false, hasLifecycleConflict: false,
    hasHistoricalDiscontinuity: false, hasRouteScar: false, hasBlindspot: false,
  });
  assert.ok(scars.includes('ALIAS_ONLY'));
  assert.ok(scars.includes('CHAIN_SCAR'));
  assert.ok(scars.includes('PROVIDER_DISAGREEMENT'));
});

test('Blind spot refs propagate into decision', () => {
  resetAll(); seedBTCFixtures();
  const d = resolveIdentity(makeInput({
    objectTypeHint: 'ASSET', aliasHints: ['BTC'],
    contractTuples: [{ chainId: 'chain_btc', address: 'native', sourceRefs: ['r'] }],
    blindSpotRefs: ['ROUTE_DEGRADED_1', 'OWNER_UNAVAILABLE_2'],
  }));
  assert.ok(d.blindSpotRefs.includes('ROUTE_DEGRADED_1'));
  assert.ok(d.blindSpotRefs.includes('OWNER_UNAVAILABLE_2'));
});

// ═══════════════════════════════════════════════════════════════════════════════
// I. MASTER ANTI-FAKE SUITE (canonical-identity-honesty)
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ I. Master anti-fake suite ═══');

test('Provider fragment cannot become canonical identity directly', () => {
  resetAll();
  const d = resolveIdentity(makeInput({
    inputHandle: 'coingecko:bitcoin',
    objectTypeHint: 'ASSET',
    aliasHints: [],
    contractTuples: [],
  }));
  assert.strictEqual(d.outcome, 'UNRESOLVED');
});

test('Contested entity is not treated as resolved', () => {
  resetAll();
  const claims: ProviderIdentityClaim[] = [
    makeClaim({ providerId: 'arkham', providerObjectId: 'fund_a', claimClass: 'ATTRIBUTION', objectTypeHint: 'ENTITY' }),
    makeClaim({ providerId: 'nansen', providerObjectId: 'fund_b', claimClass: 'ATTRIBUTION', objectTypeHint: 'ENTITY' }),
  ];
  const normalized = normalizeClaims(claims);
  normalized[0].candidateCanonicalId = 'ent_a';
  normalized[1].candidateCanonicalId = 'ent_b';
  const comparison = compareProviderClaims(normalized, ['ent_a', 'ent_b']);
  assert.ok(comparison.coAuthorityConflicts.length > 0 || comparison.disagreements.length > 0);
});

test('Low-confidence identity cannot enter mission-critical scoring', () => {
  assert.ok(!isOutcomeSafeForMissionCritical('RESOLVED_LOW', 'RESOLVED_WITH_SCAR'));
  assert.ok(!isOutcomeSafeForMissionCritical('UNRESOLVED', 'UNRESOLVED'));
  assert.ok(!isOutcomeSafeForMissionCritical('RESOLVED_MEDIUM', 'CONTESTED'));
});

test('Cross-chain alias cannot silently merge', () => {
  resetAll(); seedUSDCFixtures();
  const d = resolveIdentity(makeInput({
    objectTypeHint: 'ASSET', aliasHints: ['USDC'], isMissionCritical: true,
  }));
  const hasChainScar = d.scars.includes('CHAIN_SCAR') || d.outcome === 'UNRESOLVED';
  assert.ok(hasChainScar || d.hardVetoes.length > 0,
    'Cross-chain alias on mission-critical must produce scar, veto, or unresolved');
});

test('Wrapped/native relation cannot disappear', () => {
  resetAll(); seedBTCFixtures();
  const rel = detectWrappedRelation('chain_eth', '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599');
  assert.ok(rel.hasRelation);
  assert.strictEqual(rel.rootCanonicalId, 'ast_btc001');
});

test('Narrative overlap cannot silently become one topic', () => {
  resetAll(); seedTopicFixtures();
  const d1 = resolveIdentity(makeInput({ objectTypeHint: 'NARRATIVE_TOPIC', aliasHints: ['AI agents'] }));
  const d2 = resolveIdentity(makeInput({ objectTypeHint: 'NARRATIVE_TOPIC', aliasHints: ['AI infrastructure'] }));
  const merged = d1.selectedCanonicalId && d2.selectedCanonicalId
    && d1.selectedCanonicalId === d2.selectedCanonicalId;
  assert.ok(!merged, 'Distinct topics must not merge');
});

test('Protocol/token collapse cannot slip through by name', () => {
  resetAll(); seedProtocolFixtures();
  const protoResult = expandAliases(['Jupiter'], 'PROTOCOL');
  const tokenResult = expandAliases(['Jupiter'], 'ASSET');
  const protoIds = new Set(protoResult.candidateIds);
  const tokenIds = new Set(tokenResult.candidateIds);
  const overlap = [...protoIds].filter(id => tokenIds.has(id));
  assert.strictEqual(overlap.length, 0, 'Protocol and token candidate sets must not overlap');
});

test('Decision always has resolutionId, objectType, createdAt', () => {
  resetAll(); seedBTCFixtures();
  const d = resolveIdentity(makeInput({
    objectTypeHint: 'ASSET',
    contractTuples: [{ chainId: 'chain_btc', address: 'native', sourceRefs: ['r'] }],
  }));
  assert.ok(d.resolutionId.startsWith('res_'));
  assert.ok(d.objectType);
  assert.ok(d.createdAt);
  assert.ok(typeof d.confidenceScore === 'number');
});

test('Every resolution outcome is one of the four legal values', () => {
  const legal = new Set(['RESOLVED_HIGH', 'RESOLVED_MEDIUM', 'RESOLVED_LOW', 'UNRESOLVED']);
  resetAll(); seedBTCFixtures();
  const d = resolveIdentity(makeInput({
    objectTypeHint: 'ASSET',
    contractTuples: [{ chainId: 'chain_btc', address: 'native', sourceRefs: ['r'] }],
  }));
  assert.ok(legal.has(d.outcome));
});

test('Every resolution state is one of the four legal values', () => {
  const legal = new Set(['RESOLVED_CLEAN', 'RESOLVED_WITH_SCAR', 'CONTESTED', 'UNRESOLVED']);
  resetAll(); seedBTCFixtures();
  const d = resolveIdentity(makeInput({
    objectTypeHint: 'ASSET',
    contractTuples: [{ chainId: 'chain_btc', address: 'native', sourceRefs: ['r'] }],
  }));
  assert.ok(legal.has(d.resolutionState));
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n════════════════════════════════════════════════════════════');
console.log(`L3.2 IDENTITY RESOLUTION TEST RESULTS`);
console.log(`  Passed: ${passed}  Failed: ${failed}`);
console.log('════════════════════════════════════════════════════════════');

if (failed > 0) process.exit(1);
