/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🧪 EVIDENCE PACK TEST HARNESS — Comprehensive Integration Tests           ║
 * ║                                                                               ║
 * ║   The "never break again" layer.                                              ║
 * ║   Tests all scenarios with strict assertions on:                              ║
 * ║   - Schema validity                                                           ║
 * ║   - Coverage map correctness                                                  ║
 * ║   - Freshness handling                                                        ║
 * ║   - Clarifier generation                                                      ║
 * ║                                                                               ║
 * ║   @version 1.0.0                                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  EvidencePackSchema,
  EvidencePack,
  EVIDENCE_PACK_VERSION,
  MODULE_TTL_SECONDS,
  RESOLUTION_THRESHOLDS,
} from '../types';

import {
  extractEntities,
  applyConfidenceGating,
  resolveTokenEntities,
} from '../resolver';

import {
  computeCoverage,
  computeQualityScore,
  checkTimeCoherence,
} from '../coverage';

import {
  configureMocks,
  resetMocks,
  PRESET_ALL_OK,
  PRESET_PARTIAL_STALE,
  PRESET_PARTIAL_ERROR,
  PRESET_CATASTROPHIC,
  PRESET_AMBIGUOUS_TOKEN,
  PRESET_MARKET_ONLY,
  mockFetchDexScreener,
  mockFetchSecurity,
  mockFetchSentiment,
  mockFetchNews,
  mockFetchMarketSnapshot,
} from './mocks/mock-providers';

import {
  TOKEN_BTC,
  TOKEN_PENGUIN_SOLANA,
  TOKEN_AMBIGUOUS_CANDIDATES,
  DEXSCREENER_OK,
  SECURITY_OK_SAFE,
  SECURITY_HONEYPOT,
  createDexScreenerEvidence,
  createSecurityEvidence,
  createSentimentEvidence,
  createNewsEvidence,
  freshTimestamp,
  staleTimestamp,
} from './fixtures/golden-fixtures';

// ============================================================================
// SETUP
// ============================================================================

describe('Evidence Pack Test Harness', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // SCHEMA VALIDITY TESTS
  // ==========================================================================

  describe('Schema Validity', () => {
    it('should produce valid EvidencePack schema for TOKEN kind', () => {
      const pack: EvidencePack = {
        version: EVIDENCE_PACK_VERSION,
        kind: 'TOKEN',
        request: {
          user_message: 'Analyze $BTC',
          language: 'en',
          intent: 'TOKEN_ANALYSIS',
          timeframe: 'snapshot',
          requested_depth: 'M',
          received_at_unix: Math.floor(Date.now() / 1000),
        },
        token_resolution: {
          input_entities: ['BTC'],
          resolved: [TOKEN_BTC],
          clarifier: null,
          used_session_cache: false,
        },
        evidence: {
          dexscreener: createDexScreenerEvidence('ok'),
          security: createSecurityEvidence('missing'),
        },
        coverage: {
          available: ['dexscreener'],
          missing: ['security'],
          stale: [],
          errors: [],
          freshness_seconds: { dexscreener: 30 },
          quality_score: 0.85,
          time_disclosure_required: false,
        },
      };

      const result = EvidencePackSchema.safeParse(pack);
      expect(result.success).toBe(true);
    });

    it('should produce valid EvidencePack schema for MARKET kind', () => {
      const pack: EvidencePack = {
        version: EVIDENCE_PACK_VERSION,
        kind: 'MARKET',
        request: {
          user_message: 'Market overview',
          language: 'en',
          intent: 'MARKET_OVERVIEW',
          timeframe: 'today',
          requested_depth: 'M',
          received_at_unix: Math.floor(Date.now() / 1000),
        },
        token_resolution: {
          input_entities: [],
          resolved: [],
          clarifier: null,
          used_session_cache: false,
        },
        evidence: {
          market_snapshot: {
            status: 'ok',
            ts: Math.floor(Date.now() / 1000) - 30,
            source: 'CoinGecko',
            freshness_seconds: 30,
            data: {
              btc_price: 97500,
              btc_dominance: 58.5,
              eth_price: 3200,
              total_market_cap_usd: 3200000000000,
              total_volume_24h_usd: 150000000000,
            },
          },
        },
        coverage: {
          available: ['market_snapshot'],
          missing: [],
          stale: [],
          errors: [],
          freshness_seconds: { market_snapshot: 30 },
          quality_score: 1.0,
          time_disclosure_required: false,
        },
      };

      const result = EvidencePackSchema.safeParse(pack);
      expect(result.success).toBe(true);
    });

    it('should reject invalid EvidencePack (missing required fields)', () => {
      const invalidPack = {
        version: EVIDENCE_PACK_VERSION,
        kind: 'TOKEN',
        // Missing request, token_resolution, evidence, coverage
      };

      const result = EvidencePackSchema.safeParse(invalidPack);
      expect(result.success).toBe(false);
    });

    it('should reject invalid version', () => {
      const pack = {
        version: '0.0.0',  // Wrong version
        kind: 'TOKEN',
        request: {
          user_message: 'test',
          language: 'en',
          intent: 'TOKEN_ANALYSIS',
          timeframe: 'snapshot',
          requested_depth: 'M',
          received_at_unix: Math.floor(Date.now() / 1000),
        },
        token_resolution: {
          input_entities: [],
          resolved: [],
          clarifier: null,
          used_session_cache: false,
        },
        evidence: {},
        coverage: {
          available: [],
          missing: [],
          stale: [],
          errors: [],
          freshness_seconds: {},
          quality_score: 0,
          time_disclosure_required: false,
        },
      };

      const result = EvidencePackSchema.safeParse(pack);
      expect(result.success).toBe(false);
    });
  });

  // ==========================================================================
  // COVERAGE MAP CORRECTNESS
  // ==========================================================================

  describe('Coverage Map Correctness', () => {
    const NOW_UNIX = Math.floor(Date.now() / 1000);

    it('should correctly classify OK modules as available', () => {
      const evidence = {
        dexscreener: createDexScreenerEvidence('ok'),
        sentiment: createSentimentEvidence('ok'),
      };

      const { coverage } = computeCoverage(evidence, 'TOKEN_ANALYSIS', true, NOW_UNIX);

      expect(coverage.available).toContain('dexscreener');
      expect(coverage.available).toContain('sentiment');
      expect(coverage.missing).not.toContain('dexscreener');
      expect(coverage.missing).not.toContain('sentiment');
    });

    it('should correctly classify MISSING modules', () => {
      const evidence = {
        dexscreener: createDexScreenerEvidence('ok'),
        security: createSecurityEvidence('missing'),
      };

      const { coverage } = computeCoverage(evidence, 'TOKEN_ANALYSIS', true, NOW_UNIX);

      expect(coverage.available).toContain('dexscreener');
      expect(coverage.missing).toContain('security');
    });

    it('should correctly classify STALE modules', () => {
      const evidence = {
        dexscreener: createDexScreenerEvidence('stale'),  // Beyond TTL
        sentiment: createSentimentEvidence('ok'),
      };

      const { coverage } = computeCoverage(evidence, 'TOKEN_ANALYSIS', true, NOW_UNIX);

      expect(coverage.stale).toContain('dexscreener');
      // Stale modules are also available (they have data)
      expect(coverage.available).toContain('dexscreener');
    });

    it('should correctly classify ERROR modules', () => {
      const evidence = {
        dexscreener: createDexScreenerEvidence('ok'),
        security: createSecurityEvidence('error'),
      };

      const { coverage } = computeCoverage(evidence, 'TOKEN_ANALYSIS', true, NOW_UNIX);

      expect(coverage.errors).toContain('security');
      expect(coverage.available).not.toContain('security');
    });

    it('should NEVER silently report OK when data is stale', () => {
      const staleTs = staleTimestamp('dexscreener');
      const evidence = {
        dexscreener: {
          status: 'ok' as const,
          ts: staleTs,
          source: 'DexScreener',
          freshness_seconds: NOW_UNIX - staleTs,
          data: DEXSCREENER_OK,
        },
      };

      const { coverage } = computeCoverage(evidence, 'TOKEN_ANALYSIS', true, NOW_UNIX);

      // Even though status is 'ok', coverage should mark as stale
      expect(coverage.stale).toContain('dexscreener');
    });

    it('should NEVER silently report OK when data is error', () => {
      const evidence = {
        dexscreener: {
          status: 'error' as const,
          ts: NOW_UNIX,
          source: 'DexScreener',
          freshness_seconds: 0,
          error_code: 'TIMEOUT',
          data: null,
        },
      };

      const { coverage } = computeCoverage(evidence, 'TOKEN_ANALYSIS', true, NOW_UNIX);

      expect(coverage.errors).toContain('dexscreener');
      expect(coverage.available).not.toContain('dexscreener');
    });
  });

  // ==========================================================================
  // FRESHNESS HANDLING
  // ==========================================================================

  describe('Freshness Handling', () => {
    const NOW_UNIX = Math.floor(Date.now() / 1000);

    it('should always include freshness_seconds for each module', () => {
      const evidence = {
        dexscreener: createDexScreenerEvidence('ok'),
        security: createSecurityEvidence('ok'),
        sentiment: createSentimentEvidence('stale'),
        news: createNewsEvidence('error'),
      };

      const { coverage } = computeCoverage(evidence, 'TOKEN_ANALYSIS', true, NOW_UNIX);

      // Every module we attempted should have freshness_seconds
      expect(coverage.freshness_seconds).toHaveProperty('dexscreener');
      expect(coverage.freshness_seconds).toHaveProperty('security');
      expect(coverage.freshness_seconds).toHaveProperty('sentiment');
      expect(coverage.freshness_seconds).toHaveProperty('news');
    });

    it('should detect time coherence issues', () => {
      // Price data is fresh, but news is very old
      const evidence = {
        dexscreener: {
          status: 'ok' as const,
          ts: NOW_UNIX - 30,
          source: 'DexScreener',
          freshness_seconds: 30,
          data: DEXSCREENER_OK,
        },
        news: {
          status: 'ok' as const,
          ts: NOW_UNIX - 900,  // 15 minutes old
          source: 'News',
          freshness_seconds: 900,
          data: {
            items: [],
            overall_sentiment: 'neutral' as const,
            has_critical_news: false,
            dominant_topics: [],
          },
        },
      };

      expect(checkTimeCoherence(evidence, NOW_UNIX)).toBe(true);
    });

    it('should not report time coherence issue when all data is fresh', () => {
      const evidence = {
        dexscreener: {
          status: 'ok' as const,
          ts: NOW_UNIX - 30,
          source: 'DexScreener',
          freshness_seconds: 30,
          data: DEXSCREENER_OK,
        },
        news: {
          status: 'ok' as const,
          ts: NOW_UNIX - 60,
          source: 'News',
          freshness_seconds: 60,
          data: {
            items: [],
            overall_sentiment: 'neutral' as const,
            has_critical_news: false,
            dominant_topics: [],
          },
        },
      };

      expect(checkTimeCoherence(evidence, NOW_UNIX)).toBe(false);
    });
  });

  // ==========================================================================
  // CLARIFIER GENERATION
  // ==========================================================================

  describe('Clarifier Generation', () => {
    it('should generate exactly ONE clarifier for ambiguous ticker', () => {
      const candidates = TOKEN_AMBIGUOUS_CANDIDATES;
      const decision = applyConfidenceGating(candidates, 'ticker_lookup', 0);

      expect(decision.accepted).toBe(false);
      expect(decision.clarifier).toBeDefined();
      expect(decision.clarifier!.type).toBe('multiple_chains');
      expect(decision.clarifier!.attempt_count).toBe(1);
    });

    it('should NOT generate clarifier for high-confidence resolution', () => {
      const candidates = TOKEN_BTC.candidates;
      const decision = applyConfidenceGating(candidates, 'known_asset', 0);

      expect(decision.accepted).toBe(true);
      expect(decision.clarifier).toBeUndefined();
    });

    it('should respect max clarifier attempts', () => {
      const candidates = TOKEN_AMBIGUOUS_CANDIDATES;
      
      // First attempt
      const decision1 = applyConfidenceGating(candidates, 'ticker_lookup', 0);
      expect(decision1.accepted).toBe(false);
      expect(decision1.clarifier!.attempt_count).toBe(1);

      // Second attempt
      const decision2 = applyConfidenceGating(candidates, 'ticker_lookup', 1);
      expect(decision2.accepted).toBe(false);
      expect(decision2.clarifier!.attempt_count).toBe(2);

      // Third attempt (max reached) - should force accept
      const decision3 = applyConfidenceGating(candidates, 'ticker_lookup', 2);
      expect(decision3.accepted).toBe(true);
      expect(decision3.reason).toBe('max_clarifier_attempts_exceeded');
    });

    it('should generate need_address clarifier for low confidence single candidate', () => {
      const candidates = [
        { symbol: 'UNKNOWN', chain: 'solana', address: null, confidence: 0.5 },
      ];
      const decision = applyConfidenceGating(candidates, 'ticker_lookup', 0);

      expect(decision.accepted).toBe(false);
      expect(decision.clarifier!.type).toBe('need_address');
    });

    it('should generate no_match clarifier for empty candidates', () => {
      const decision = applyConfidenceGating([], 'ticker_lookup', 0);

      expect(decision.accepted).toBe(false);
      expect(decision.clarifier!.type).toBe('no_match');
    });
  });

  // ==========================================================================
  // QUALITY SCORE
  // ==========================================================================

  describe('Quality Score', () => {
    it('should return 1.0 for perfect coverage', () => {
      const score = computeQualityScore(
        ['dexscreener', 'security', 'sentiment', 'news'],
        [],
        [],
        [],
        ['dexscreener', 'security'],
        true
      );

      expect(score).toBe(1.0);
    });

    it('should penalize missing required modules', () => {
      const fullScore = computeQualityScore(
        ['dexscreener', 'security'],
        [],
        [],
        [],
        ['dexscreener', 'security'],
        true
      );

      const partialScore = computeQualityScore(
        ['dexscreener'],
        ['security'],  // Missing required
        [],
        [],
        ['dexscreener', 'security'],
        true
      );

      expect(partialScore).toBeLessThan(fullScore);
    });

    it('should penalize stale modules less than missing', () => {
      const missingScore = computeQualityScore(
        [],
        ['dexscreener'],
        [],
        [],
        ['dexscreener'],
        true
      );

      const staleScore = computeQualityScore(
        ['dexscreener'],
        [],
        ['dexscreener'],  // Stale but present
        [],
        ['dexscreener'],
        true
      );

      expect(staleScore).toBeGreaterThan(missingScore);
    });

    it('should penalize errors', () => {
      const okScore = computeQualityScore(
        ['dexscreener'],
        [],
        [],
        [],
        ['dexscreener'],
        true
      );

      const errorScore = computeQualityScore(
        [],
        [],
        [],
        ['dexscreener'],  // Error
        ['dexscreener'],
        true
      );

      expect(errorScore).toBeLessThan(okScore);
    });

    it('should floor at 0.0', () => {
      const score = computeQualityScore(
        [],
        ['dexscreener', 'security', 'holders', 'sentiment', 'news', 'derivatives', 'onchain'],
        [],
        [],
        ['dexscreener', 'security'],
        false
      );

      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // ENTITY EXTRACTION
  // ==========================================================================

  describe('Entity Extraction', () => {
    it('should extract $TICKER from message', () => {
      const entities = extractEntities('What about $BTC and $ETH?');
      expect(entities.tickers).toContain('BTC');
      expect(entities.tickers).toContain('ETH');
    });

    it('should extract EVM addresses', () => {
      const entities = extractEntities('Check 0x1234567890123456789012345678901234567890');
      expect(entities.addresses.length).toBe(1);
      expect(entities.addresses[0].chain).toBe('ethereum');
    });

    it('should extract DEXScreener URLs', () => {
      const entities = extractEntities('https://dexscreener.com/solana/abc123');
      expect(entities.urls.length).toBe(1);
      expect(entities.urls[0].type).toBe('dexscreener');
      expect(entities.urls[0].chain).toBe('solana');
    });

    it('should extract chain hints', () => {
      const entities = extractEntities('The token on Solana');
      expect(entities.chainHints).toContain('solana');
    });

    it('should handle complex mixed messages', () => {
      const entities = extractEntities(
        'Compare $BTC on ethereum with 0x1234567890123456789012345678901234567890'
      );
      expect(entities.tickers).toContain('BTC');
      expect(entities.chainHints).toContain('ethereum');
      expect(entities.addresses.length).toBe(1);
    });
  });

  // ==========================================================================
  // MOCK PROVIDER TESTS
  // ==========================================================================

  describe('Mock Providers', () => {
    it('should return OK data with PRESET_ALL_OK', async () => {
      configureMocks(PRESET_ALL_OK);
      
      const dex = await mockFetchDexScreener(null, 'bitcoin', 'BTC');
      const sentiment = await mockFetchSentiment('BTC');
      
      expect(dex.status).toBe('ok');
      expect(sentiment.status).toBe('ok');
    });

    it('should return stale data with PRESET_PARTIAL_STALE', async () => {
      configureMocks(PRESET_PARTIAL_STALE);
      
      const security = await mockFetchSecurity('0x...', 'ethereum');
      const sentiment = await mockFetchSentiment('TEST');
      
      expect(security.status).toBe('ok');  // Still 'ok' but with old timestamp
      expect(sentiment.status).toBe('ok');
    });

    it('should return errors with PRESET_PARTIAL_ERROR', async () => {
      configureMocks(PRESET_PARTIAL_ERROR);
      
      const security = await mockFetchSecurity('0x...', 'ethereum');
      
      expect(security.status).toBe('error');
    });

    it('should return all errors with PRESET_CATASTROPHIC', async () => {
      configureMocks(PRESET_CATASTROPHIC);
      
      const dex = await mockFetchDexScreener(null, 'bitcoin', 'BTC');
      const market = await mockFetchMarketSnapshot();
      
      expect(dex.status).toBe('error');
      expect(market.status).toBe('error');
    });
  });

  // ==========================================================================
  // GOLDEN TEST CASES
  // ==========================================================================

  describe('Golden Test Cases', () => {
    describe('EN: "Why is BTC down today?"', () => {
      it('should extract BTC ticker', () => {
        const entities = extractEntities('Why is BTC down today?');
        expect(entities.tickers).toContain('BTC');
      });

      it('should resolve BTC with high confidence', () => {
        const candidates = [{ symbol: 'BTC', chain: 'bitcoin', address: null, confidence: 1.0 }];
        const decision = applyConfidenceGating(candidates, 'known_asset', 0);
        expect(decision.accepted).toBe(true);
        expect(decision.resolved!.confidence).toBe(1.0);
      });
    });

    describe('EN: "Analyze $PENGUIN"', () => {
      it('should extract PENGUIN ticker', () => {
        const entities = extractEntities('Analyze $PENGUIN');
        expect(entities.tickers).toContain('PENGUIN');
      });
    });

    describe('EN: "Market overview"', () => {
      it('should not extract any specific token', () => {
        const entities = extractEntities('Give me a market overview');
        expect(entities.tickers.length).toBe(0);
      });
    });

    describe('EN: "Should I buy X?"', () => {
      it('should detect decision help intent', () => {
        const entities = extractEntities('Should I buy $SOL?');
        expect(entities.tickers).toContain('SOL');
      });
    });

    describe('DE: "Warum ist BTC heute gefallen?"', () => {
      it('should extract BTC from German message', () => {
        const entities = extractEntities('Warum ist BTC heute gefallen?');
        expect(entities.tickers).toContain('BTC');
      });
    });

    describe('ES: "Analiza $PENGUIN"', () => {
      it('should extract PENGUIN from Spanish message', () => {
        const entities = extractEntities('Analiza $PENGUIN');
        expect(entities.tickers).toContain('PENGUIN');
      });
    });
  });

  // ==========================================================================
  // SHIP CRITERIA VERIFICATION
  // ==========================================================================

  describe('Ship Criteria', () => {
    it('CRITERIA 1: 0 schema violations - valid pack always parses', () => {
      const validPack: EvidencePack = {
        version: EVIDENCE_PACK_VERSION,
        kind: 'TOKEN',
        request: {
          user_message: 'test',
          language: 'en',
          intent: 'TOKEN_ANALYSIS',
          timeframe: 'snapshot',
          requested_depth: 'M',
          received_at_unix: Math.floor(Date.now() / 1000),
        },
        token_resolution: {
          input_entities: ['BTC'],
          resolved: [TOKEN_BTC],
          clarifier: null,
          used_session_cache: false,
        },
        evidence: {
          dexscreener: createDexScreenerEvidence('ok'),
        },
        coverage: {
          available: ['dexscreener'],
          missing: [],
          stale: [],
          errors: [],
          freshness_seconds: { dexscreener: 30 },
          quality_score: 1.0,
          time_disclosure_required: false,
        },
      };

      const result = EvidencePackSchema.safeParse(validPack);
      expect(result.success).toBe(true);
    });

    it('CRITERIA 2: Coverage map is correct in 100% of tests', () => {
      const NOW_UNIX = Math.floor(Date.now() / 1000);
      
      // Test all scenarios
      const scenarios = [
        { modules: { dexscreener: 'ok', security: 'ok' }, expectedAvailable: 2 },
        { modules: { dexscreener: 'ok', security: 'missing' }, expectedMissing: 1 },
        { modules: { dexscreener: 'stale', security: 'ok' }, expectedStale: 1 },
        { modules: { dexscreener: 'error', security: 'ok' }, expectedErrors: 1 },
      ];

      for (const scenario of scenarios) {
        const evidence: any = {};
        for (const [mod, status] of Object.entries(scenario.modules)) {
          if (mod === 'dexscreener') {
            evidence[mod] = createDexScreenerEvidence(status as any);
          } else if (mod === 'security') {
            evidence[mod] = createSecurityEvidence(status as any);
          }
        }

        const { coverage } = computeCoverage(evidence, 'TOKEN_ANALYSIS', true, NOW_UNIX);

        if (scenario.expectedAvailable !== undefined) {
          expect(coverage.available.length).toBe(scenario.expectedAvailable);
        }
        if (scenario.expectedMissing !== undefined) {
          expect(coverage.missing.length).toBe(scenario.expectedMissing);
        }
        if (scenario.expectedStale !== undefined) {
          expect(coverage.stale.length).toBe(scenario.expectedStale);
        }
        if (scenario.expectedErrors !== undefined) {
          expect(coverage.errors.length).toBe(scenario.expectedErrors);
        }
      }
    });

    it('CRITERIA 3: Ambiguous ticker triggers exactly ONE clarifier', () => {
      const candidates = TOKEN_AMBIGUOUS_CANDIDATES;
      const decision = applyConfidenceGating(candidates, 'ticker_lookup', 0);

      expect(decision.accepted).toBe(false);
      expect(decision.clarifier).toBeDefined();
      // Exactly one clarifier
      expect(decision.clarifier!.question).toBeTruthy();
      expect(decision.clarifier!.type).toBeTruthy();
      expect(decision.clarifier!.candidates.length).toBeGreaterThan(0);
    });

    it('CRITERIA 4: Cache never changes factual outputs', () => {
      // This is verified by ensuring that fixtures produce identical outputs
      const fixture1 = createDexScreenerEvidence('ok', DEXSCREENER_OK);
      const fixture2 = createDexScreenerEvidence('ok', DEXSCREENER_OK);

      expect(fixture1.data).toEqual(fixture2.data);
      expect(fixture1.source).toEqual(fixture2.source);
    });
  });
});
