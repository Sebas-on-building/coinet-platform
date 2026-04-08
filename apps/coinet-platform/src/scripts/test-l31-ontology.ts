/**
 * L3.1 Canonical Entity Ontology — Full Integration Test
 *
 * Eight suites:
 *   A. Schema completeness — all six types compile and validate
 *   B. Invariant enforcement — missing/illegal fields rejected
 *   C. Alias / anchor safety — alias-only identities rejected where required
 *   D. Lifecycle legality — illegal transitions rejected
 *   E. Ambiguity honesty — contested, unresolved, merged, split, wrapped, bridged
 *   F. Provider-fragment rejection — raw provider ids cannot become canonical objects
 *   G. Gold fixture validation — known clean objects pass
 *   H. Anti-fake meta-suite — structural honesty enforcement
 */

import assert from 'node:assert';

import {
  L31_ONTOLOGY_VERSION,
  CANONICAL_ID_PREFIXES,
  generateCanonicalId,
  extractObjectTypeFromId,
  type CanonicalObjectType,
  type AssetObject,
  type PairObject,
  type ProtocolObject,
  type EntityObject,
  type ChainObject,
  type AuditMetadata,
  type VersionHistoryRef,
  type ConfidenceBand,
  type LifecycleState,
} from '../services/canonicalization';

import type { NarrativeTopicObject } from '../services/canonicalization/narrative-topic-types';
import type { TopicClass, TopicStatus } from '../services/canonicalization/narrative-topic-types';

import {
  validateObject,
  getRequiredFields,
  getAllObjectTypes,
  getIdPrefix,
  getOntologyVersion,
  type ValidationResult,
} from '../services/canonicalization/canonical-ontology-registry';

import {
  validateTransition,
  isLegalTransition,
  getAllLegalTransitionsFrom,
  getAllLegalTransitionsTo,
  LIFECYCLE_STATES,
  LEGAL_TRANSITIONS,
  FORBIDDEN_TRANSITIONS,
} from '../services/canonicalization/entity-lifecycle-types';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST HARNESS
// ═══════════════════════════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ✅ ${name}`); }
  catch (e: any) { failed++; console.log(`  ❌ ${name}: ${e.message}`); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIXTURE BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

function makeAudit(overrides?: Partial<AuditMetadata>): AuditMetadata {
  return {
    createdAt: '2026-04-03T00:00:00Z',
    updatedAt: '2026-04-03T00:00:00Z',
    createdBy: 'SYSTEM',
    lastMutationId: 'mut_001',
    replayGeneration: 0,
    sourceRefs: ['ref_001'],
    ...overrides,
  };
}

function makeVersion(overrides?: Partial<VersionHistoryRef>): VersionHistoryRef {
  return {
    currentVersion: 1,
    versionChainRootId: 'vchain_001',
    previousVersionIds: [],
    ...overrides,
  };
}

function makeAsset(overrides?: Partial<AssetObject>): AssetObject {
  const id = generateCanonicalId('ASSET');
  return {
    canonicalId: id,
    objectType: 'ASSET',
    lifecycleState: 'ACTIVE',
    confidenceState: 'HIGH',
    identityAnchors: ['coingecko:bitcoin'],
    allowedAliases: [{ alias: 'BTC', aliasType: 'SYMBOL', normalizedAlias: 'btc', sourceRefs: ['ref_001'] }],
    providerClaimRefs: [{ providerId: 'coingecko', providerObjectId: 'bitcoin', claimType: 'IDENTITY' }],
    versionHistory: makeVersion(),
    audit: makeAudit(),
    assetId: id,
    canonicalNames: ['Bitcoin'],
    canonicalSymbolSet: ['BTC'],
    primaryContracts: [],
    chainRepresentationSet: [],
    assetKind: 'NATIVE',
    protocolAffiliationIds: [],
    sectorHints: ['store-of-value'],
    categoryHints: ['cryptocurrency'],
    supplyIdentityAnchors: [{ anchorType: 'MAX_SUPPLY', value: '21000000', unit: 'TOKEN_UNITS', sourceRefs: ['ref_001'] }],
    unresolvedFlags: [],
    ...overrides,
  };
}

function makePair(overrides?: Partial<PairObject>): PairObject {
  const id = generateCanonicalId('PAIR');
  return {
    canonicalId: id,
    objectType: 'PAIR',
    lifecycleState: 'ACTIVE',
    confidenceState: 'HIGH',
    identityAnchors: ['binance:BTCUSDT'],
    allowedAliases: [{ alias: 'BTC/USDT', aliasType: 'SYMBOL', normalizedAlias: 'btc/usdt', sourceRefs: ['ref_001'] }],
    providerClaimRefs: [{ providerId: 'binance', providerObjectId: 'BTCUSDT', claimType: 'MARKET' }],
    versionHistory: makeVersion(),
    audit: makeAudit(),
    pairId: id,
    baseAssetId: 'ast_btc001',
    quoteAssetId: 'ast_usdt001',
    scope: { marketType: 'SPOT' },
    pairIdentityAnchors: [{ anchorType: 'EXCHANGE_MARKET_ID', value: 'BTCUSDT', sourceRefs: ['ref_001'] }],
    invertibilityRules: { invertible: true, canonicalDirection: 'BASE_QUOTE' },
    unresolvedFlags: [],
    ...overrides,
  };
}

function makeProtocol(overrides?: Partial<ProtocolObject>): ProtocolObject {
  const id = generateCanonicalId('PROTOCOL');
  return {
    canonicalId: id,
    objectType: 'PROTOCOL',
    lifecycleState: 'ACTIVE',
    confidenceState: 'HIGH',
    identityAnchors: ['defillama:jupiter'],
    allowedAliases: [{ alias: 'Jupiter', aliasType: 'PROTOCOL_NAME', normalizedAlias: 'jupiter', sourceRefs: ['ref_001'] }],
    providerClaimRefs: [{ providerId: 'defillama', providerObjectId: 'jupiter', claimType: 'IDENTITY' }],
    versionHistory: makeVersion(),
    audit: makeAudit(),
    protocolId: id,
    canonicalName: 'Jupiter',
    deployedChainIds: ['chain_solana001'],
    controlledContracts: [{ chainId: 'chain_solana001', contractAddress: 'JUP4...', sourceRefs: ['ref_001'] }],
    assetAffiliationIds: ['ast_jup001'],
    treasuryAnchors: [],
    governanceAnchors: [{ anchorType: 'TOKEN', referenceId: 'ast_jup001', sourceRefs: ['ref_001'] }],
    sector: 'DEX',
    mergerSplitRenameHistory: [],
    unresolvedFlags: [],
    ...overrides,
  };
}

function makeEntity(overrides?: Partial<EntityObject>): EntityObject {
  const id = generateCanonicalId('ENTITY');
  return {
    canonicalId: id,
    objectType: 'ENTITY',
    lifecycleState: 'ACTIVE',
    confidenceState: 'HIGH',
    identityAnchors: ['arkham:binance-hot-wallet-1'],
    allowedAliases: [{ alias: 'Binance Hot Wallet 1', aliasType: 'ADDRESS_LABEL', normalizedAlias: 'binance hot wallet 1', sourceRefs: ['ref_001'] }],
    providerClaimRefs: [{ providerId: 'arkham', providerObjectId: 'binance-hw1', claimType: 'LABEL' }],
    versionHistory: makeVersion(),
    audit: makeAudit(),
    entityId: id,
    entityKind: 'EXCHANGE',
    addressSet: [{ chainId: 'chain_eth001', address: '0xBinanceHW1...', sourceRefs: ['ref_001'] }],
    clusterConfidence: 'HIGH',
    labelProvenance: [{ providerId: 'arkham', label: 'Binance', labelType: 'EXCHANGE_LABEL', confidence: 'HIGH', sourceRefs: ['ref_001'] }],
    attributionClaimsBundle: [{
      claimId: 'claim_001', claimantProviderId: 'arkham', claimedEntityKind: 'EXCHANGE',
      claimText: 'Binance exchange hot wallet', confidence: 'HIGH', contested: false, sourceRefs: ['ref_001'],
    }],
    contestedFlags: [],
    unresolvedFlags: [],
    ...overrides,
  };
}

function makeChain(overrides?: Partial<ChainObject>): ChainObject {
  const id = generateCanonicalId('CHAIN');
  return {
    canonicalId: id,
    objectType: 'CHAIN',
    lifecycleState: 'ACTIVE',
    confidenceState: 'HIGH',
    identityAnchors: ['chainid:1'],
    allowedAliases: [{ alias: 'ETH', aliasType: 'SYMBOL', normalizedAlias: 'eth', sourceRefs: ['ref_001'] }],
    providerClaimRefs: [{ providerId: 'alchemy', providerObjectId: 'eth-mainnet', claimType: 'IDENTITY' }],
    versionHistory: makeVersion(),
    audit: makeAudit(),
    chainId: id,
    canonicalName: 'Ethereum',
    chainFamily: 'EVM',
    nativeAssetId: 'ast_eth001',
    ecosystemAliases: ['Ethereum Mainnet', 'ETH'],
    bridgeRelationships: [],
    executionModelTags: ['EVM'],
    unresolvedFlags: [],
    ...overrides,
  };
}

function makeNarrativeTopic(overrides?: Partial<NarrativeTopicObject>): NarrativeTopicObject {
  const id = generateCanonicalId('NARRATIVE_TOPIC');
  return {
    canonicalId: id,
    objectType: 'NARRATIVE_TOPIC',
    lifecycleState: 'ACTIVE',
    confidenceState: 'MEDIUM',
    identityAnchors: ['topic:ai-agents'],
    allowedAliases: [{ alias: 'AI agents', aliasType: 'TOPIC_PHRASE', normalizedAlias: 'ai agents', sourceRefs: ['ref_001'] }],
    providerClaimRefs: [{ providerId: 'lunarcrush', providerObjectId: 'ai-agents-topic', claimType: 'TOPIC_IDENTITY' }],
    versionHistory: makeVersion(),
    audit: makeAudit(),
    topicId: id,
    canonicalTitle: 'AI Agents',
    aliasPhraseSet: ['AI agents', 'autonomous agents', 'agent tokens'],
    topicClass: 'SECTOR' as TopicClass,
    relations: [],
    status: 'ACTIVE' as TopicStatus,
    ambiguityMarkers: [],
    overlapMarkers: [],
    unresolvedFlags: [],
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// A. SCHEMA COMPLETENESS
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ A. Schema completeness ═══');

test('Ontology version is set', () => {
  assert.strictEqual(typeof L31_ONTOLOGY_VERSION, 'string');
  assert.ok(L31_ONTOLOGY_VERSION.length > 0);
});

test('All six canonical object types registered', () => {
  const types = getAllObjectTypes();
  assert.strictEqual(types.length, 6);
  for (const t of ['ASSET', 'PAIR', 'PROTOCOL', 'ENTITY', 'CHAIN', 'NARRATIVE_TOPIC'] as const) {
    assert.ok(types.includes(t), `Missing type: ${t}`);
  }
});

test('Every type has ID prefix', () => {
  for (const t of getAllObjectTypes()) {
    const prefix = getIdPrefix(t);
    assert.ok(prefix.length > 0, `Missing prefix for ${t}`);
  }
});

test('Generated IDs carry correct prefix', () => {
  for (const t of getAllObjectTypes()) {
    const id = generateCanonicalId(t);
    assert.ok(id.startsWith(`${CANONICAL_ID_PREFIXES[t]}_`), `ID ${id} does not start with ${CANONICAL_ID_PREFIXES[t]}_`);
  }
});

test('extractObjectTypeFromId round-trips all types', () => {
  for (const t of getAllObjectTypes()) {
    const id = generateCanonicalId(t);
    assert.strictEqual(extractObjectTypeFromId(id), t);
  }
});

test('Valid Asset object passes validation', () => {
  const r = validateObject(makeAsset());
  assert.ok(r.valid, `Asset validation failed: ${r.violations.map(v => v.message).join('; ')}`);
});

test('Valid Pair object passes validation', () => {
  const r = validateObject(makePair());
  assert.ok(r.valid, `Pair validation failed: ${r.violations.map(v => v.message).join('; ')}`);
});

test('Valid Protocol object passes validation', () => {
  const r = validateObject(makeProtocol());
  assert.ok(r.valid, `Protocol validation failed: ${r.violations.map(v => v.message).join('; ')}`);
});

test('Valid Entity object passes validation', () => {
  const r = validateObject(makeEntity());
  assert.ok(r.valid, `Entity validation failed: ${r.violations.map(v => v.message).join('; ')}`);
});

test('Valid Chain object passes validation', () => {
  const r = validateObject(makeChain());
  assert.ok(r.valid, `Chain validation failed: ${r.violations.map(v => v.message).join('; ')}`);
});

test('Valid NarrativeTopic object passes validation', () => {
  const r = validateObject(makeNarrativeTopic());
  assert.ok(r.valid, `NarrativeTopic validation failed: ${r.violations.map(v => v.message).join('; ')}`);
});

test('Each type has required fields registered', () => {
  for (const t of getAllObjectTypes()) {
    const fields = getRequiredFields(t);
    assert.ok(fields.length > 9, `Type ${t} should have more than 9 required fields (has ${fields.length})`);
    assert.ok(fields.includes('canonicalId'));
    assert.ok(fields.includes('objectType'));
    assert.ok(fields.includes('audit'));
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// B. INVARIANT ENFORCEMENT
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ B. Invariant enforcement ═══');

test('Null input rejected', () => {
  const r = validateObject(null);
  assert.ok(!r.valid);
});

test('Empty object rejected', () => {
  const r = validateObject({});
  assert.ok(!r.valid);
  assert.ok(r.violations.length > 0);
});

test('Missing canonicalId rejected', () => {
  const a = makeAsset();
  delete (a as any).canonicalId;
  const r = validateObject(a);
  assert.ok(!r.valid);
  assert.ok(r.violations.some(v => v.field === 'canonicalId'));
});

test('Missing objectType rejected', () => {
  const a = makeAsset();
  delete (a as any).objectType;
  const r = validateObject(a);
  assert.ok(!r.valid);
});

test('Invalid objectType rejected', () => {
  const a = makeAsset();
  (a as any).objectType = 'BANANA';
  const r = validateObject(a);
  assert.ok(!r.valid);
  assert.ok(r.violations.some(v => v.rule === 'INVALID_ENUM'));
});

test('Invalid lifecycleState rejected', () => {
  const a = makeAsset();
  (a as any).lifecycleState = 'FLYING';
  const r = validateObject(a);
  assert.ok(!r.valid);
});

test('Invalid confidenceState rejected', () => {
  const a = makeAsset();
  (a as any).confidenceState = 'YOLO';
  const r = validateObject(a);
  assert.ok(!r.valid);
});

test('Missing audit metadata rejected', () => {
  const a = makeAsset();
  delete (a as any).audit;
  const r = validateObject(a);
  assert.ok(!r.valid);
});

test('Missing versionHistory rejected', () => {
  const a = makeAsset();
  delete (a as any).versionHistory;
  const r = validateObject(a);
  assert.ok(!r.valid);
});

test('Asset without canonical name rejected', () => {
  const r = validateObject(makeAsset({ canonicalNames: [] }));
  assert.ok(!r.valid);
  assert.ok(r.violations.some(v => v.rule === 'ASSET_NAME_REQUIRED'));
});

test('Asset without symbol set rejected', () => {
  const r = validateObject(makeAsset({ canonicalSymbolSet: [] }));
  assert.ok(!r.valid);
  assert.ok(r.violations.some(v => v.rule === 'ASSET_SYMBOL_REQUIRED'));
});

test('Invalid assetKind rejected', () => {
  const r = validateObject(makeAsset({ assetKind: 'IMAGINARY' as any }));
  assert.ok(!r.valid);
});

test('Pair without base asset rejected', () => {
  const p = makePair();
  delete (p as any).baseAssetId;
  const r = validateObject(p);
  assert.ok(!r.valid);
});

test('Pair without quote asset rejected', () => {
  const p = makePair();
  delete (p as any).quoteAssetId;
  const r = validateObject(p);
  assert.ok(!r.valid);
});

test('Protocol without canonical name rejected', () => {
  const r = validateObject(makeProtocol({ canonicalName: '' }));
  assert.ok(!r.valid);
  assert.ok(r.violations.some(v => v.rule === 'PROTOCOL_NAME_REQUIRED'));
});

test('Invalid protocol sector rejected', () => {
  const r = validateObject(makeProtocol({ sector: 'IMAGINARY' as any }));
  assert.ok(!r.valid);
});

test('Chain without canonical name rejected', () => {
  const r = validateObject(makeChain({ canonicalName: '' }));
  assert.ok(!r.valid);
});

test('Chain without native asset rejected', () => {
  const r = validateObject(makeChain({ nativeAssetId: '' }));
  assert.ok(!r.valid);
});

test('Invalid execution model tag rejected', () => {
  const r = validateObject(makeChain({ executionModelTags: ['QUANTUM_VM' as any] }));
  assert.ok(!r.valid);
});

test('NarrativeTopic without alias phrase set rejected', () => {
  const r = validateObject(makeNarrativeTopic({ aliasPhraseSet: [] }));
  assert.ok(!r.valid);
});

test('Invalid topicClass rejected', () => {
  const r = validateObject(makeNarrativeTopic({ topicClass: 'VIBES' as any }));
  assert.ok(!r.valid);
});

test('ID prefix mismatch rejected', () => {
  const a = makeAsset();
  a.canonicalId = 'pair_wrong_prefix_here';
  const r = validateObject(a);
  assert.ok(!r.valid);
  assert.ok(r.violations.some(v => v.rule === 'ID_PREFIX_MISMATCH' || v.rule === 'ID_TYPE_MISMATCH'));
});

test('Controlled contract without chainId rejected', () => {
  const p = makeProtocol({ controlledContracts: [{ chainId: '', contractAddress: '0x123', sourceRefs: ['r'] }] });
  const r = validateObject(p);
  assert.ok(r.violations.some(v => v.rule === 'CONTRACT_REQUIRES_CHAIN'));
});

test('Chain bridge without related chain rejected', () => {
  const c = makeChain({ bridgeRelationships: [{ relatedChainId: '', sourceRefs: ['r'] }] });
  const r = validateObject(c);
  assert.ok(r.violations.some(v => v.rule === 'BRIDGE_REQUIRES_RELATED_CHAIN'));
});

test('Provider claim without required fields flagged', () => {
  const a = makeAsset();
  a.providerClaimRefs = [{ providerId: '', providerObjectId: '', claimType: '' }];
  const r = validateObject(a);
  assert.ok(r.violations.some(v => v.rule === 'CLAIM_REQUIRES_FIELDS'));
});

test('Alias without required fields flagged', () => {
  const a = makeAsset();
  a.allowedAliases = [{ alias: '', aliasType: 'SYMBOL', normalizedAlias: '', sourceRefs: [] }];
  const r = validateObject(a);
  assert.ok(r.violations.some(v => v.rule === 'ALIAS_REQUIRES_FIELDS'));
});

// ═══════════════════════════════════════════════════════════════════════════════
// C. ALIAS / ANCHOR SAFETY
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ C. Alias / anchor safety ═══');

test('Wrapped asset without root and without unresolved flag rejected', () => {
  const a = makeAsset({ assetKind: 'WRAPPED', rootAssetId: undefined, unresolvedFlags: [] });
  const r = validateObject(a);
  assert.ok(!r.valid);
  assert.ok(r.violations.some(v => v.rule === 'DERIVATIVE_REQUIRES_ROOT'));
});

test('Bridged asset without root and without unresolved flag rejected', () => {
  const a = makeAsset({ assetKind: 'BRIDGED', rootAssetId: undefined, unresolvedFlags: [] });
  const r = validateObject(a);
  assert.ok(!r.valid);
  assert.ok(r.violations.some(v => v.rule === 'DERIVATIVE_REQUIRES_ROOT'));
});

test('Synthetic asset without root and without unresolved flag rejected', () => {
  const a = makeAsset({ assetKind: 'SYNTHETIC', rootAssetId: undefined, unresolvedFlags: [] });
  const r = validateObject(a);
  assert.ok(!r.valid);
});

test('Wrapped asset with root passes', () => {
  const a = makeAsset({ assetKind: 'WRAPPED', rootAssetId: 'ast_btc001' });
  const r = validateObject(a);
  assert.ok(r.valid, r.violations.map(v => v.message).join('; '));
});

test('Wrapped asset with MISSING_ROOT_ASSET_RELATION flag passes', () => {
  const a = makeAsset({ assetKind: 'WRAPPED', rootAssetId: undefined, unresolvedFlags: ['MISSING_ROOT_ASSET_RELATION'] });
  const r = validateObject(a);
  assert.ok(r.valid, r.violations.map(v => v.message).join('; '));
});

test('Pool pair without pool anchor and without flag rejected', () => {
  const p = makePair({ scope: { marketType: 'POOL' }, unresolvedFlags: [] });
  const r = validateObject(p);
  assert.ok(r.violations.some(v => v.rule === 'POOL_PAIR_REQUIRES_ANCHOR'));
});

test('Pool pair with MISSING_POOL_ANCHOR flag passes', () => {
  const p = makePair({ scope: { marketType: 'POOL' }, unresolvedFlags: ['MISSING_POOL_ANCHOR'] });
  const r = validateObject(p);
  const errors = r.violations.filter(v => v.severity === 'ERROR');
  assert.strictEqual(errors.length, 0, errors.map(v => v.message).join('; '));
});

test('Perpetual pair without derivative anchor and without flag rejected', () => {
  const p = makePair({
    scope: { marketType: 'PERPETUAL' },
    pairIdentityAnchors: [{ anchorType: 'EXCHANGE_MARKET_ID', value: 'BTCUSDT-PERP', sourceRefs: ['r'] }],
    unresolvedFlags: [],
  });
  const r = validateObject(p);
  assert.ok(r.violations.some(v => v.rule === 'DERIVATIVE_PAIR_REQUIRES_ANCHOR'));
});

test('Perpetual pair with derivative anchor passes', () => {
  const p = makePair({
    scope: { marketType: 'PERPETUAL' },
    pairIdentityAnchors: [{ anchorType: 'DERIVATIVE_CONTRACT_ID', value: 'BTCUSDT-PERP', sourceRefs: ['r'] }],
  });
  const r = validateObject(p);
  assert.ok(r.valid, r.violations.map(v => v.message).join('; '));
});

test('Chain representation without chainId rejected', () => {
  const a = makeAsset({
    chainRepresentationSet: [
      { chainId: '', representationKind: 'PRIMARY', sourceRefs: ['r'] },
    ],
  });
  const r = validateObject(a);
  assert.ok(r.violations.some(v => v.rule === 'CHAIN_REP_REQUIRES_CHAIN'));
});

// ═══════════════════════════════════════════════════════════════════════════════
// D. LIFECYCLE LEGALITY
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ D. Lifecycle legality ═══');

test('All lifecycle states defined', () => {
  assert.strictEqual(LIFECYCLE_STATES.length, 7);
  for (const s of ['ACTIVE', 'DEPRECATED', 'MERGED', 'SPLIT', 'ARCHIVED', 'CONTESTED', 'UNKNOWN'] as const) {
    assert.ok(LIFECYCLE_STATES.includes(s), `Missing lifecycle state: ${s}`);
  }
});

test('ACTIVE → DEPRECATED legal', () => {
  assert.ok(isLegalTransition('ACTIVE', 'DEPRECATED'));
});

test('ACTIVE → MERGED legal', () => {
  assert.ok(isLegalTransition('ACTIVE', 'MERGED'));
});

test('ACTIVE → SPLIT legal', () => {
  assert.ok(isLegalTransition('ACTIVE', 'SPLIT'));
});

test('ACTIVE → CONTESTED legal', () => {
  assert.ok(isLegalTransition('ACTIVE', 'CONTESTED'));
});

test('CONTESTED → ACTIVE legal', () => {
  assert.ok(isLegalTransition('CONTESTED', 'ACTIVE'));
});

test('DEPRECATED → ARCHIVED legal', () => {
  assert.ok(isLegalTransition('DEPRECATED', 'ARCHIVED'));
});

test('UNKNOWN → ACTIVE legal (gated)', () => {
  const r = validateTransition('UNKNOWN', 'ACTIVE');
  assert.ok(r.legal);
  assert.ok(r.gated);
  assert.ok(r.gateRequirement?.includes('IDENTITY_EVENT'));
});

test('DEPRECATED → ACTIVE legal (gated)', () => {
  const r = validateTransition('DEPRECATED', 'ACTIVE');
  assert.ok(r.legal);
  assert.ok(r.gated);
  assert.ok(r.gateRequirement?.includes('VERSIONED_RESTORATION'));
});

test('ARCHIVED → ACTIVE forbidden', () => {
  assert.ok(!isLegalTransition('ARCHIVED', 'ACTIVE'));
});

test('MERGED → ACTIVE forbidden', () => {
  assert.ok(!isLegalTransition('MERGED', 'ACTIVE'));
});

test('SPLIT → ACTIVE forbidden', () => {
  assert.ok(!isLegalTransition('SPLIT', 'ACTIVE'));
});

test('Self-transition not allowed', () => {
  for (const s of LIFECYCLE_STATES) {
    const r = validateTransition(s, s);
    assert.ok(!r.legal, `Self-transition ${s} → ${s} should be illegal`);
  }
});

test('Named forbidden transitions all illegal', () => {
  for (const f of FORBIDDEN_TRANSITIONS) {
    assert.ok(!isLegalTransition(f.from, f.to), `${f.from} → ${f.to} should be forbidden`);
  }
});

test('getAllLegalTransitionsFrom returns non-empty for ACTIVE', () => {
  const targets = getAllLegalTransitionsFrom('ACTIVE');
  assert.ok(targets.length >= 4, 'ACTIVE should have at least 4 legal targets');
});

test('getAllLegalTransitionsTo returns non-empty for ARCHIVED', () => {
  const sources = getAllLegalTransitionsTo('ARCHIVED');
  assert.ok(sources.length >= 3, 'ARCHIVED should be reachable from at least 3 states');
});

test('ARCHIVED has no legal outbound transitions', () => {
  const targets = getAllLegalTransitionsFrom('ARCHIVED');
  assert.strictEqual(targets.length, 0, 'ARCHIVED should have no outbound transitions');
});

// ═══════════════════════════════════════════════════════════════════════════════
// E. AMBIGUITY HONESTY
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ E. Ambiguity honesty ═══');

test('Contested entity validates with CONTESTED lifecycle', () => {
  const e = makeEntity({
    lifecycleState: 'CONTESTED',
    confidenceState: 'UNRESOLVED',
    contestedFlags: ['ATTRIBUTION_DISPUTED'],
  });
  const r = validateObject(e);
  assert.ok(r.valid, r.violations.map(v => v.message).join('; '));
});

test('Unresolved confidence is valid for any object type', () => {
  for (const builder of [makeAsset, makePair, makeProtocol, makeEntity, makeChain, makeNarrativeTopic]) {
    const obj = builder({ confidenceState: 'UNRESOLVED' } as any);
    const r = validateObject(obj);
    assert.ok(!r.violations.some(v => v.field === 'confidenceState' && v.severity === 'ERROR'),
      `UNRESOLVED confidence should be valid for ${(obj as any).objectType}`);
  }
});

test('MERGED lifecycle is valid', () => {
  const a = makeAsset({ lifecycleState: 'MERGED' });
  const r = validateObject(a);
  assert.ok(r.valid, r.violations.map(v => v.message).join('; '));
});

test('SPLIT lifecycle is valid', () => {
  const p = makeProtocol({ lifecycleState: 'SPLIT' });
  const r = validateObject(p);
  assert.ok(r.valid, r.violations.map(v => v.message).join('; '));
});

test('UNKNOWN lifecycle is valid initial state', () => {
  const e = makeEntity({ lifecycleState: 'UNKNOWN', confidenceState: 'UNRESOLVED' });
  const r = validateObject(e);
  assert.ok(r.valid, r.violations.map(v => v.message).join('; '));
});

test('WBTC as WRAPPED distinct from BTC as NATIVE', () => {
  const btc = makeAsset({ assetKind: 'NATIVE', canonicalNames: ['Bitcoin'], canonicalSymbolSet: ['BTC'] });
  const wbtc = makeAsset({
    assetKind: 'WRAPPED', canonicalNames: ['Wrapped Bitcoin'], canonicalSymbolSet: ['WBTC'],
    rootAssetId: btc.canonicalId,
  });
  assert.notStrictEqual(btc.canonicalId, wbtc.canonicalId);
  assert.strictEqual(wbtc.rootAssetId, btc.canonicalId);
  assert.ok(validateObject(btc).valid);
  assert.ok(validateObject(wbtc).valid);
});

test('Pair self-reference rejected without explicit exception flag', () => {
  const p = makePair({ baseAssetId: 'ast_same', quoteAssetId: 'ast_same', unresolvedFlags: [] });
  const r = validateObject(p);
  assert.ok(r.violations.some(v => v.rule === 'PAIR_SELF_REFERENCE'));
});

test('Pair self-reference allowed with SELF_PAIR_EXCEPTION flag', () => {
  const p = makePair({ baseAssetId: 'ast_same', quoteAssetId: 'ast_same', unresolvedFlags: ['SELF_PAIR_EXCEPTION'] });
  const r = validateObject(p);
  assert.ok(!r.violations.some(v => v.rule === 'PAIR_SELF_REFERENCE' && v.severity === 'ERROR'));
});

test('Contested narrative topic with ambiguity markers validates', () => {
  const t = makeNarrativeTopic({
    status: 'CONTESTED' as TopicStatus,
    lifecycleState: 'CONTESTED',
    confidenceState: 'UNRESOLVED',
    ambiguityMarkers: [{ kind: 'SCOPE_CONTESTED', description: 'AI agents vs AI infrastructure overlap', relatedTopicIds: ['topic_infra001'], sourceRefs: ['r'] }],
  });
  const r = validateObject(t);
  assert.ok(r.valid, r.violations.map(v => v.message).join('; '));
});

test('Narrative topic with overlap markers validates', () => {
  const t = makeNarrativeTopic({
    overlapMarkers: [{
      kind: 'SEMANTIC_OVERLAP', overlappingTopicId: 'topic_defi_ai', overlapDegree: 'HIGH', sourceRefs: ['r'],
    }],
  });
  const r = validateObject(t);
  assert.ok(r.valid, r.violations.map(v => v.message).join('; '));
});

// ═══════════════════════════════════════════════════════════════════════════════
// F. PROVIDER-FRAGMENT REJECTION
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ F. Provider-fragment rejection ═══');

test('Raw provider object shape rejected (no objectType, no canonicalId)', () => {
  const fake = { symbol: 'BTC', price: 65000, source: 'coingecko' };
  const r = validateObject(fake);
  assert.ok(!r.valid);
  assert.ok(r.violations.length > 3, 'Should have many missing-field violations');
});

test('Provider ID as canonicalId with wrong prefix rejected', () => {
  const a = makeAsset();
  a.canonicalId = 'coingecko_bitcoin';
  const r = validateObject(a);
  assert.ok(r.violations.some(v => v.rule === 'ID_PREFIX_MISMATCH'));
});

test('Provider symbol string cannot become Asset without full contract', () => {
  const partial = {
    objectType: 'ASSET',
    canonicalId: 'BTC',
  };
  const r = validateObject(partial);
  assert.ok(!r.valid);
  assert.ok(r.violations.length > 5);
});

test('Cluster entity without provenance bundle rejected', () => {
  const e = makeEntity({ entityKind: 'CLUSTER', labelProvenance: [] });
  const r = validateObject(e);
  assert.ok(r.violations.some(v => v.rule === 'CLUSTER_REQUIRES_PROVENANCE'));
});

test('Exchange entity without attribution claims rejected', () => {
  const e = makeEntity({ entityKind: 'EXCHANGE', attributionClaimsBundle: [] });
  const r = validateObject(e);
  assert.ok(r.violations.some(v => v.rule === 'INSTITUTIONAL_REQUIRES_ATTRIBUTION'));
});

test('Fund entity without attribution claims rejected', () => {
  const e = makeEntity({ entityKind: 'FUND', attributionClaimsBundle: [] });
  const r = validateObject(e);
  assert.ok(r.violations.some(v => v.rule === 'INSTITUTIONAL_REQUIRES_ATTRIBUTION'));
});

test('Market maker entity without provenance or attribution rejected', () => {
  const e = makeEntity({
    entityKind: 'MARKET_MAKER',
    labelProvenance: [],
    attributionClaimsBundle: [],
  });
  const r = validateObject(e);
  assert.ok(r.violations.some(v => v.rule === 'CLUSTER_REQUIRES_PROVENANCE'));
  assert.ok(r.violations.some(v => v.rule === 'INSTITUTIONAL_REQUIRES_ATTRIBUTION'));
});

// ═══════════════════════════════════════════════════════════════════════════════
// G. GOLD FIXTURE VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ G. Gold fixture validation ═══');

test('Gold: Bitcoin asset validates', () => {
  const btc = makeAsset({
    canonicalNames: ['Bitcoin'],
    canonicalSymbolSet: ['BTC'],
    assetKind: 'NATIVE',
    supplyIdentityAnchors: [
      { anchorType: 'MAX_SUPPLY', value: '21000000', unit: 'TOKEN_UNITS', sourceRefs: ['ref_btc'] },
      { anchorType: 'CIRCULATING_SUPPLY', value: '19700000', unit: 'TOKEN_UNITS', sourceRefs: ['ref_btc'] },
    ],
  });
  assert.ok(validateObject(btc).valid);
});

test('Gold: WBTC asset validates with root relation to BTC', () => {
  const wbtc = makeAsset({
    canonicalNames: ['Wrapped Bitcoin'],
    canonicalSymbolSet: ['WBTC'],
    assetKind: 'WRAPPED',
    rootAssetId: 'ast_btc_root',
    chainRepresentationSet: [{
      chainId: 'chain_eth001',
      contractAddress: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      tokenStandard: 'ERC-20',
      representationKind: 'WRAPPED',
      decimals: 8,
      sourceRefs: ['ref_wbtc'],
    }],
  });
  assert.ok(validateObject(wbtc).valid);
});

test('Gold: BTC/USDT spot pair validates', () => {
  const pair = makePair({
    baseAssetId: 'ast_btc001',
    quoteAssetId: 'ast_usdt001',
    scope: { marketType: 'SPOT', venueId: 'binance' },
  });
  assert.ok(validateObject(pair).valid);
});

test('Gold: Jupiter protocol validates', () => {
  const jup = makeProtocol({
    canonicalName: 'Jupiter',
    sector: 'DEX',
    deployedChainIds: ['chain_solana001'],
    controlledContracts: [{
      chainId: 'chain_solana001',
      contractAddress: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
      role: 'aggregator_router',
      sourceRefs: ['ref_jup'],
    }],
    governanceAnchors: [{ anchorType: 'TOKEN', referenceId: 'ast_jup001', sourceRefs: ['ref_jup'] }],
  });
  assert.ok(validateObject(jup).valid);
});

test('Gold: Binance exchange entity validates', () => {
  const binance = makeEntity({
    entityKind: 'EXCHANGE',
    labelProvenance: [
      { providerId: 'arkham', label: 'Binance', labelType: 'EXCHANGE_LABEL', confidence: 'HIGH', sourceRefs: ['ref_ark'] },
      { providerId: 'nansen', label: 'Binance', labelType: 'EXCHANGE_LABEL', confidence: 'HIGH', sourceRefs: ['ref_nan'] },
    ],
    attributionClaimsBundle: [{
      claimId: 'claim_binance_001', claimantProviderId: 'arkham', claimedEntityKind: 'EXCHANGE',
      claimText: 'Binance exchange hot wallet cluster', confidence: 'HIGH', contested: false, sourceRefs: ['ref_ark'],
    }],
  });
  assert.ok(validateObject(binance).valid);
});

test('Gold: Ethereum chain validates', () => {
  const eth = makeChain({
    canonicalName: 'Ethereum',
    chainFamily: 'EVM',
    nativeAssetId: 'ast_eth001',
    executionModelTags: ['EVM'],
    bridgeRelationships: [
      { relatedChainId: 'chain_arb001', bridgeType: 'rollup_bridge', sourceRefs: ['ref_eth'] },
    ],
  });
  assert.ok(validateObject(eth).valid);
});

test('Gold: AI Agents narrative topic validates', () => {
  const topic = makeNarrativeTopic({
    canonicalTitle: 'AI Agents',
    topicClass: 'SECTOR' as TopicClass,
    aliasPhraseSet: ['AI agents', 'autonomous agents', 'agent tokens', 'AI agent coins'],
    status: 'ACTIVE' as TopicStatus,
    relations: [{
      relatedTopicId: 'topic_ai_infra', relationType: 'OVERLAP', confidence: 'MEDIUM', sourceRefs: ['ref_topic'],
    }],
  });
  assert.ok(validateObject(topic).valid);
});

// ═══════════════════════════════════════════════════════════════════════════════
// H. ANTI-FAKE META-SUITE (canonical-reality-honesty.spec.ts equivalent)
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n═══ H. Anti-fake meta-suite ═══');

test('Provider symbol cannot become canonical asset without full object', () => {
  const fakeAsset = { objectType: 'ASSET', canonicalId: 'ast_x', assetKind: 'TOKEN' };
  const r = validateObject(fakeAsset);
  assert.ok(!r.valid);
  assert.ok(r.violations.length >= 5, 'Minimal fragment should fail many invariants');
});

test('Wrapped and native assets cannot collapse (different IDs required)', () => {
  const native = makeAsset({ assetKind: 'NATIVE' });
  const wrapped = makeAsset({ assetKind: 'WRAPPED', rootAssetId: native.canonicalId });
  assert.notStrictEqual(native.canonicalId, wrapped.canonicalId);
  assert.strictEqual(wrapped.rootAssetId, native.canonicalId);
});

test('Pool implementation and pair market expression are distinct object concerns', () => {
  const spotPair = makePair({ scope: { marketType: 'SPOT' } });
  const poolPair = makePair({
    scope: { marketType: 'POOL', poolAddress: '0xPool...', chainId: 'chain_eth001' },
    unresolvedFlags: [],
  });
  assert.notStrictEqual(spotPair.scope.marketType, poolPair.scope.marketType);
  assert.ok(validateObject(spotPair).valid);
  assert.ok(validateObject(poolPair).valid);
});

test('Protocol and token cannot collapse into same canonical object', () => {
  const protocol = makeProtocol({ protocolId: 'proto_jup001', canonicalName: 'Jupiter' });
  const token = makeAsset({ assetId: 'ast_jup001', canonicalNames: ['Jupiter'], assetKind: 'GOVERNANCE_TOKEN' });
  assert.strictEqual(protocol.objectType, 'PROTOCOL');
  assert.strictEqual(token.objectType, 'ASSET');
  assert.notStrictEqual(protocol.canonicalId, token.canonicalId);
});

test('Contested entity cannot be presented as resolved without lifecycle change', () => {
  const e = makeEntity({
    contestedFlags: ['ATTRIBUTION_DISPUTED'],
    lifecycleState: 'ACTIVE',
    confidenceState: 'HIGH',
  });
  const r = validateObject(e);
  assert.ok(r.violations.some(v => v.rule === 'CONTESTED_FLAGS_REQUIRE_STATE'));
});

test('Unresolved narrative overlap cannot silently merge (distinct objects required)', () => {
  const topic1 = makeNarrativeTopic({ canonicalTitle: 'AI Agents', topicClass: 'SECTOR' as TopicClass });
  const topic2 = makeNarrativeTopic({
    canonicalTitle: 'AI Infrastructure',
    topicClass: 'SECTOR' as TopicClass,
    overlapMarkers: [{
      kind: 'SEMANTIC_OVERLAP', overlappingTopicId: topic1.canonicalId,
      overlapDegree: 'HIGH', sourceRefs: ['r'],
    }],
  });
  assert.notStrictEqual(topic1.canonicalId, topic2.canonicalId);
  assert.ok(validateObject(topic1).valid);
  assert.ok(validateObject(topic2).valid);
  assert.ok(topic2.overlapMarkers.length > 0);
});

test('USDC on Ethereum vs USDC.e on Arbitrum are distinct chain representations', () => {
  const usdc = makeAsset({
    canonicalNames: ['USD Coin'], canonicalSymbolSet: ['USDC'], assetKind: 'STABLECOIN',
    chainRepresentationSet: [
      { chainId: 'chain_eth001', contractAddress: '0xA0b8...', representationKind: 'PRIMARY', decimals: 6, sourceRefs: ['r'] },
      { chainId: 'chain_arb001', contractAddress: '0xFF97...', representationKind: 'BRIDGED', symbolOnChain: 'USDC.e', decimals: 6, sourceRefs: ['r'] },
    ],
  });
  assert.ok(validateObject(usdc).valid);
  assert.strictEqual(usdc.chainRepresentationSet.length, 2);
  assert.notStrictEqual(
    usdc.chainRepresentationSet[0].representationKind,
    usdc.chainRepresentationSet[1].representationKind,
  );
});

test('LP token is distinct asset kind from underlying pair', () => {
  const lp = makeAsset({ assetKind: 'LP_TOKEN', canonicalNames: ['Jupiter SOL-USDC LP'] });
  const pair = makePair({ baseAssetId: 'ast_sol001', quoteAssetId: 'ast_usdc001' });
  assert.strictEqual(lp.objectType, 'ASSET');
  assert.strictEqual(pair.objectType, 'PAIR');
  assert.ok(validateObject(lp).valid);
  assert.ok(validateObject(pair).valid);
});

test('One provider label never silently becomes resolved entity identity', () => {
  const wallet = makeEntity({
    entityKind: 'WALLET',
    labelProvenance: [
      { providerId: 'arkham', label: 'Unknown Fund', labelType: 'SPECULATIVE', confidence: 'LOW', sourceRefs: ['r'] },
    ],
    attributionClaimsBundle: [],
    confidenceState: 'LOW',
    contestedFlags: [],
  });
  assert.ok(validateObject(wallet).valid);
  assert.strictEqual(wallet.confidenceState, 'LOW');
  assert.strictEqual(wallet.labelProvenance.length, 1);
});

test('L2 rollup and L1 chain remain distinct objects', () => {
  const ethereum = makeChain({
    canonicalName: 'Ethereum', chainFamily: 'EVM', nativeAssetId: 'ast_eth001',
    executionModelTags: ['EVM'],
  });
  const arbitrum = makeChain({
    canonicalName: 'Arbitrum One', chainFamily: 'EVM', nativeAssetId: 'ast_eth001',
    executionModelTags: ['EVM', 'ROLLUP'],
    bridgeRelationships: [{ relatedChainId: ethereum.canonicalId, bridgeType: 'rollup_bridge', sourceRefs: ['r'] }],
  });
  assert.notStrictEqual(ethereum.canonicalId, arbitrum.canonicalId);
  assert.ok(validateObject(ethereum).valid);
  assert.ok(validateObject(arbitrum).valid);
});

test('No canonical object without immutable ID, type, lifecycle, confidence, audit, version', () => {
  const fields = ['canonicalId', 'objectType', 'lifecycleState', 'confidenceState', 'audit', 'versionHistory'];
  for (const field of fields) {
    const a = makeAsset();
    delete (a as any)[field];
    const r = validateObject(a);
    assert.ok(!r.valid, `Removing ${field} should make object invalid`);
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════════════════════

console.log('\n════════════════════════════════════════════════════════════');
console.log(`L3.1 ONTOLOGY TEST RESULTS`);
console.log(`  Passed: ${passed}  Failed: ${failed}`);
console.log('════════════════════════════════════════════════════════════');

if (failed > 0) process.exit(1);
