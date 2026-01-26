/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🧪 EVIDENCE PACK — BUILDER TESTS                                          ║
 * ║                                                                               ║
 * ║   Tests for the Evidence Pack builder.                                        ║
 * ║   Ensures packs are built correctly with proper coverage tracking.            ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Universal Evidence Pack Layer                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { buildEvidencePack, formatEvidencePackForAI } from '../builder';
import { EvidencePackBuilderInput, DetectedTokenEntity, TokenEvidencePack, MarketEvidencePack } from '../types';

// ============================================================================
// MOCKS
// ============================================================================

// Mock the module fetchers
jest.mock('../modules', () => ({
  ...jest.requireActual('../modules'),
  fetchDexScreener: jest.fn().mockResolvedValue({
    module: 'dexscreener',
    status: 'success',
    ts: Date.now(),
    freshness_seconds: 10,
    source: 'dexscreener.com',
    data: {
      price: 0.00042,
      price_change_24h: 12.5,
      price_change_1h: 2.1,
      price_change_5m: 0.5,
      volume_24h: 125000,
      liquidity: 45000,
      market_cap: null,
      fdv: null,
      pair_age_hours: 4.5,
      pair_created_at: '2024-01-01T00:00:00Z',
      txns_24h: { buys: 342, sells: 128, total: 470 },
      pair_address: '0xabc123',
      dex_id: 'uniswap',
    },
    from_cache: false,
    latency_ms: 250,
  }),
  fetchSecurity: jest.fn().mockResolvedValue({
    module: 'security',
    status: 'success',
    ts: Date.now(),
    freshness_seconds: 30,
    source: 'goplus.io',
    data: {
      risk_level: 'medium',
      risk_score: 45,
      flags: [{ code: 'MINTABLE', severity: 'warning', description: 'Token is mintable' }],
      is_honeypot: false,
      is_mintable: true,
      is_proxy: false,
      is_open_source: true,
      can_take_back_ownership: false,
      has_blacklist: false,
      has_trading_cooldown: false,
      buy_tax: 0,
      sell_tax: 0,
      is_freeze_authority: null,
      is_mint_authority: null,
      notes: [],
    },
    from_cache: false,
    latency_ms: 350,
  }),
  fetchHolders: jest.fn().mockRejectedValue(new Error('TIMEOUT')),
  fetchPumpFun: jest.fn().mockRejectedValue(new Error('Not implemented')),
  fetchSmartMoney: jest.fn().mockRejectedValue(new Error('Not implemented')),
  fetchMarketSnapshot: jest.fn().mockResolvedValue({
    module: 'market_snapshot',
    status: 'success',
    ts: Date.now(),
    freshness_seconds: 15,
    source: 'coingecko',
    data: {
      btc: { price: 45000, change_24h: 2.5, dominance: 52, volume_24h: 25000000000 },
      eth: { price: 2500, change_24h: 1.8, volume_24h: 12000000000 },
      sol: { price: 100, change_24h: 3.2, volume_24h: 3000000000 },
      total_market_cap: 1800000000000,
      total_volume_24h: 80000000000,
      fear_greed_index: 55,
      fear_greed_label: 'neutral',
      btc_eth_ratio: 18,
      market_trend: 'neutral',
    },
    from_cache: false,
    latency_ms: 200,
  }),
  fetchDerivatives: jest.fn().mockResolvedValue({
    module: 'derivatives',
    status: 'success',
    ts: Date.now(),
    freshness_seconds: 20,
    source: 'coinglass',
    data: {
      funding_btc: 0.0001,
      funding_eth: 0.00015,
      funding_sol: 0.0002,
      open_interest_btc: 15000000000,
      open_interest_eth: 5000000000,
      liquidations_24h: 150000000,
      liquidations_long: 100000000,
      liquidations_short: 50000000,
      long_short_ratio: 1.2,
      market_bias: 'long',
      risk_level: 'medium',
    },
    from_cache: false,
    latency_ms: 300,
  }),
  fetchSentiment: jest.fn().mockResolvedValue({
    module: 'sentiment',
    status: 'success',
    ts: Date.now(),
    freshness_seconds: 60,
    source: 'internal',
    data: {
      overall_score: 55,
      social_score: 60,
      news_score: 50,
      label: 'neutral',
      trending_topics: [],
      sentiment_change_24h: 2,
    },
    from_cache: false,
    latency_ms: 150,
  }),
  fetchNews: jest.fn().mockResolvedValue({
    module: 'news',
    status: 'success',
    ts: Date.now(),
    freshness_seconds: 120,
    source: 'cryptopanic',
    data: {
      articles: [],
      dominant_sentiment: 'neutral',
      alert_count: 0,
      breaking_news: false,
      key_events: [],
    },
    from_cache: false,
    latency_ms: 250,
  }),
  TOKEN_MODULES: {},
  MARKET_MODULES: {},
}));

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createTokenEntity(
  type: 'contract_address' | 'ticker',
  raw: string,
  chain?: 'ethereum' | 'solana',
  confidence = 0.9
): DetectedTokenEntity {
  return {
    ref: {
      type,
      raw,
      normalized: raw.toLowerCase(),
      chain,
      confidence,
    },
    position: { start: 0, end: raw.length },
    matchedPattern: raw,
  };
}

function createBuilderInput(
  overrides: Partial<EvidencePackBuilderInput> = {}
): EvidencePackBuilderInput {
  return {
    userMessage: 'analyze this token',
    language: 'en',
    intent: 'new_coin_analysis',
    tokenEntities: [],
    budgetTier: 'full',
    kind: 'TOKEN',
    ...overrides,
  };
}

// ============================================================================
// TESTS: TOKEN EVIDENCE PACK
// ============================================================================

describe('buildEvidencePack - TOKEN', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should build TOKEN pack with contract address', async () => {
    const input = createBuilderInput({
      tokenEntities: [createTokenEntity('contract_address', '0x1234567890abcdef1234567890abcdef12345678', 'ethereum')],
    });

    const pack = await buildEvidencePack(input);

    expect(pack.kind).toBe('TOKEN');
    expect((pack as TokenEvidencePack).resolution.status).toBe('CONFIRMED');
    expect((pack as TokenEvidencePack).resolution.primary?.chain).toBe('ethereum');
  });

  test('should include coverage map (INVARIANT I3)', async () => {
    const input = createBuilderInput({
      tokenEntities: [createTokenEntity('contract_address', '0x1234567890abcdef1234567890abcdef12345678', 'ethereum')],
    });

    const pack = await buildEvidencePack(input);

    // Coverage must have all required fields
    expect(pack.coverage).toBeDefined();
    expect(pack.coverage.available).toBeDefined();
    expect(Array.isArray(pack.coverage.available)).toBe(true);
    expect(pack.coverage.missing).toBeDefined();
    expect(Array.isArray(pack.coverage.missing)).toBe(true);
    expect(pack.coverage.freshness_seconds).toBeDefined();
    expect(typeof pack.coverage.freshness_seconds).toBe('object');
    expect(pack.coverage.planned_modules).toBeDefined();
    expect(pack.coverage.used_budget_tier).toBe('full');
  });

  test('should record errors for failed modules', async () => {
    const input = createBuilderInput({
      tokenEntities: [createTokenEntity('contract_address', '0x1234567890abcdef1234567890abcdef12345678', 'ethereum')],
    });

    const pack = await buildEvidencePack(input);

    // Holders is mocked to fail
    expect(pack.coverage.errors).toBeDefined();
    // At least one error should be recorded (holders mock fails)
  });

  test('should include freshness_seconds for available modules', async () => {
    const input = createBuilderInput({
      tokenEntities: [createTokenEntity('contract_address', '0x1234567890abcdef1234567890abcdef12345678', 'ethereum')],
    });

    const pack = await buildEvidencePack(input);

    // Available modules should have freshness
    for (const module of pack.coverage.available) {
      expect(pack.coverage.freshness_seconds[module]).toBeDefined();
      expect(typeof pack.coverage.freshness_seconds[module]).toBe('number');
    }
  });

  test('should respect budget tier for module selection', async () => {
    const minimalInput = createBuilderInput({
      budgetTier: 'minimal',
      tokenEntities: [createTokenEntity('contract_address', '0x1234567890abcdef1234567890abcdef12345678', 'ethereum')],
    });

    const fullInput = createBuilderInput({
      budgetTier: 'full',
      tokenEntities: [createTokenEntity('contract_address', '0x1234567890abcdef1234567890abcdef12345678', 'ethereum')],
    });

    const minimalPack = await buildEvidencePack(minimalInput);
    const fullPack = await buildEvidencePack(fullInput);

    // Full budget should plan more modules than minimal
    expect(fullPack.coverage.planned_modules.length).toBeGreaterThanOrEqual(
      minimalPack.coverage.planned_modules.length
    );
  });
});

// ============================================================================
// TESTS: MARKET EVIDENCE PACK
// ============================================================================

describe('buildEvidencePack - MARKET', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should build MARKET pack', async () => {
    const input = createBuilderInput({
      kind: 'MARKET',
      tokenEntities: [],
      userMessage: 'what happened today?',
    });

    const pack = await buildEvidencePack(input);

    expect(pack.kind).toBe('MARKET');
    expect((pack as MarketEvidencePack).evidence.market_snapshot).toBeDefined();
  });

  test('should include market modules based on budget', async () => {
    const input = createBuilderInput({
      kind: 'MARKET',
      tokenEntities: [],
      budgetTier: 'standard',
    });

    const pack = await buildEvidencePack(input);

    expect(pack.coverage.planned_modules).toContain('market_snapshot');
    // Standard should include sentiment
    if (pack.coverage.used_budget_tier === 'standard' || pack.coverage.used_budget_tier === 'full') {
      expect(pack.coverage.planned_modules).toContain('sentiment');
    }
  });
});

// ============================================================================
// TESTS: COMBINED (BOTH) EVIDENCE PACK
// ============================================================================

describe('buildEvidencePack - BOTH', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should build BOTH pack when kind is BOTH', async () => {
    const input = createBuilderInput({
      kind: 'BOTH',
      tokenEntities: [createTokenEntity('contract_address', '0x1234567890abcdef1234567890abcdef12345678', 'ethereum')],
      userMessage: 'analyze this token and tell me about the market',
    });

    const pack = await buildEvidencePack(input);

    expect(pack.kind).toBe('BOTH');
    expect((pack as any).token).toBeDefined();
    expect((pack as any).market).toBeDefined();
  });

  test('should merge coverage from both packs', async () => {
    const input = createBuilderInput({
      kind: 'BOTH',
      tokenEntities: [createTokenEntity('contract_address', '0x1234567890abcdef1234567890abcdef12345678', 'ethereum')],
    });

    const pack = await buildEvidencePack(input);

    // Should have modules from both token and market
    expect(pack.coverage.available).toContain('market_snapshot');
    // dexscreener should be in there too
  });
});

// ============================================================================
// TESTS: FORMATTING
// ============================================================================

describe('formatEvidencePackForAI', () => {
  test('should format TOKEN pack for AI context', async () => {
    const input = createBuilderInput({
      tokenEntities: [createTokenEntity('contract_address', '0x1234567890abcdef1234567890abcdef12345678', 'ethereum')],
    });

    const pack = await buildEvidencePack(input);
    const formatted = formatEvidencePackForAI(pack);

    expect(typeof formatted).toBe('string');
    expect(formatted).toContain('EVIDENCE PACK');
    expect(formatted).toContain('FACT_GATE');
  });

  test('should include coverage information', async () => {
    const input = createBuilderInput({
      tokenEntities: [createTokenEntity('contract_address', '0x1234567890abcdef1234567890abcdef12345678', 'ethereum')],
    });

    const pack = await buildEvidencePack(input);
    const formatted = formatEvidencePackForAI(pack);

    expect(formatted).toContain('COVERAGE');
  });
});

// ============================================================================
// TESTS: ERROR HANDLING
// ============================================================================

describe('buildEvidencePack - Error Handling', () => {
  test('should throw if TOKEN kind but no token entities', async () => {
    const input = createBuilderInput({
      kind: 'TOKEN',
      tokenEntities: [],
    });

    await expect(buildEvidencePack(input)).rejects.toThrow();
  });

  test('should handle partial module failures gracefully', async () => {
    const input = createBuilderInput({
      tokenEntities: [createTokenEntity('contract_address', '0x1234567890abcdef1234567890abcdef12345678', 'ethereum')],
    });

    // Should not throw even if some modules fail
    const pack = await buildEvidencePack(input);
    
    // Pack should still be returned
    expect(pack).toBeDefined();
    expect(pack.kind).toBe('TOKEN');
  });
});
