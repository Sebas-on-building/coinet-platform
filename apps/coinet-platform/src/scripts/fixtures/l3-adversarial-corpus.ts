/**
 * Layer 3 Master Certification — Adversarial Corpus
 *
 * Known crypto intelligence failure modes that must be structurally
 * blocked by Layer 3. Each case is a trap that would break a
 * naive aggregator.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IDENTITY ADVERSARIAL CASES
// ═══════════════════════════════════════════════════════════════════════════════

export const IDENTITY_TRAPS = {
  sameTickerDifferentChains: {
    description: 'USDC on Ethereum vs USDC.e on Arbitrum share ticker',
    symbolA: 'USDC', chainA: 'chain_eth', contractA: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    symbolB: 'USDC', chainB: 'chain_arb', contractB: '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    mustNotMerge: true,
  },
  wrappedNativeEquivalence: {
    description: 'WBTC is not BTC — wrapped relation, not same asset',
    symbolA: 'BTC', chainA: 'chain_btc',
    symbolB: 'WBTC', chainB: 'chain_eth', contractB: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    mustNotMerge: true, mustPreserveRelation: true,
  },
  protocolTokenSameBrand: {
    description: 'Uniswap protocol != UNI token',
    protocolName: 'Uniswap', tokenSymbol: 'UNI',
    protocolId: 'proto_uniswap', tokenId: 'ast_uni',
    mustNotCollapse: true,
  },
  entityLabelWeakProvenance: {
    description: 'One provider calling a wallet "Alameda" is not proof',
    address: '0xdeadbeef...', label: 'Alameda Research',
    singleProvider: true, multiProviderAgreement: false,
    mustRemainContested: true,
  },
  pairLabelMatchesPool: {
    description: 'BTC/USDT string matching a Uniswap pool label',
    pairLabel: 'BTC/USDT', poolAddress: '0xpool123',
    mustNotCollapse: true,
  },
  staleConfirmerVsFreshOwner: {
    description: 'Stale confirmer data should not override fresh owner claim',
    ownerFreshness: 'FRESH', confirmerFreshness: 'STALE',
    ownerAuthority: 'OWNER', confirmerAuthority: 'CONFIRMER',
    ownerShouldWin: true,
  },
  narrativeOverlapPartialEvidence: {
    description: '"AI Agents" and "AI Infra" overlap but are distinct under partial evidence',
    topicA: 'AI Agents', topicB: 'AI Infrastructure',
    sharedTerms: ['AI'], distinctTerms: ['agents', 'infrastructure'],
    mustNotMerge: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// METRIC ADVERSARIAL CASES
// ═══════════════════════════════════════════════════════════════════════════════

export const METRIC_TRAPS = {
  markPriceCalledPrice: {
    description: 'Provider calls mark price just "price"',
    rawFieldName: 'price', actualBasis: 'mark',
    correctPath: 'price.mark.usd', wrongPath: 'price.spot.usd',
    mustNotMapToSpot: true,
  },
  poolQuoteCalledSpotPrice: {
    description: 'DEX pool quote called "spotPrice"',
    rawFieldName: 'spotPrice', actualBasis: 'pool_quote',
    correctPath: 'price.pool.quote', wrongPath: 'price.spot.usd',
    mustNotMapToSpot: true,
  },
  treasuryMislabeledAsTVL: {
    description: 'Treasury value reported as TVL',
    rawFieldName: 'tvl', actualBasis: 'treasury',
    correctPath: 'protocol.treasury.usd', wrongPath: 'protocol.tvl.usd',
    mustNotMerge: true,
  },
  missingWindowMetadata: {
    description: '24h volume field without window metadata',
    rawFieldName: 'volume_24h', missingWindow: true,
    mustBlockValidation: true,
  },
  rawCountAsSeverity: {
    description: 'Flag count field mapped as severity score',
    rawFieldName: 'risk_flags', actualUnit: 'COUNT',
    wrongUnit: 'SEVERITY',
    mustNotMergeWithSeverity: true,
  },
  attentionAsConfirmation: {
    description: 'Social attention score presented as confirmed event',
    rawFieldName: 'galaxy_score', actualBasis: 'narrative_intensity',
    mustNotEnterJudgment: true,
  },
  notionalAndContractsMixed: {
    description: 'OI in USD vs OI in contracts treated as same metric',
    pathA: 'oi.notional.usd', pathB: 'oi.contracts',
    unitA: 'USD', unitB: 'COUNT',
    mustNotMerge: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// RECONCILIATION ADVERSARIAL CASES
// ═══════════════════════════════════════════════════════════════════════════════

export const RECONCILIATION_TRAPS = {
  threeWeakVsOneStrong: {
    description: 'Three weak providers agreeing cannot override one strong owner anchor',
    weakProviders: ['prov_w1', 'prov_w2', 'prov_w3'],
    strongProvider: 'prov_owner',
    strongAnchor: { type: 'contract', value: '0xStrong' },
    weakAnchor: { type: 'alias', value: 'SomeToken' },
    strongMustWin: true,
  },
  coAuthorityWithEnrichers: {
    description: 'Co-authority conflict should not be resolved by enricher agreement',
    authorityA: { providerId: 'prov_a', role: 'OWNER', claim: 'ObjectA' },
    authorityB: { providerId: 'prov_b', role: 'OWNER', claim: 'ObjectB' },
    enrichers: [{ providerId: 'prov_e1', claim: 'ObjectA' }, { providerId: 'prov_e2', claim: 'ObjectA' }],
    mustRemainContested: true,
  },
  hiddenSplitByAlias: {
    description: 'Two distinct objects hidden by alias similarity',
    aliasA: 'Solana DeFi', aliasB: 'Solana DeFi Protocol',
    underlyingObjectsDistinct: true,
    mustNotMerge: true,
  },
  hiddenMergeByOldSplit: {
    description: 'Two objects were falsely split and should be merged',
    objectA: 'ast_x1', objectB: 'ast_x2',
    priorSplitWasFalse: true,
    mergeShouldBeDetectable: true,
  },
  unresolvedAsTemporary: {
    description: 'Unresolved conflict disguised as temporary mismatch',
    conflictSeverity: 'HIGH',
    disguisedAs: 'TEMPORARY_NON_WINNER',
    mustPreserveAsConflict: true,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATION ADVERSARIAL CASES
// ═══════════════════════════════════════════════════════════════════════════════

export const MUTATION_TRAPS = {
  aliasRemovalWithoutHistory: {
    description: 'Alias removed must leave historical trace',
    alias: 'OldTicker',
    mustPreserveHistory: true,
  },
  contractRevisionWithoutVersion: {
    description: 'Metric contract change must bump version',
    metricPath: 'price.spot.usd',
    fieldChanged: 'blockedUsesUnderUncertainty',
    mustBumpVersion: true,
  },
  splitChainLosingParent: {
    description: 'Split child objects must preserve parent lineage',
    parentId: 'ast_parent',
    childIds: ['ast_child_a', 'ast_child_b'],
    mustPreserveAncestry: true,
  },
  rollbackErasesOriginal: {
    description: 'Rollback must not erase original mutation from ledger',
    originalMutationId: 'mut_original',
    mustPreserveOriginal: true,
  },
  supersededDisappears: {
    description: 'Superseded version must remain queryable in history',
    versionId: 'ver_old',
    mustRemainQueryable: true,
  },
};
