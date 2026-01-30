/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📦 EVIDENCE PACK — TEST SUITE                                             ║
 * ║                                                                               ║
 * ║   Tests for token resolution, coverage computation, and pack building.        ║
 * ║                                                                               ║
 * ║   @version 1.0.0                                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { describe, it, expect, beforeEach } from 'vitest';

import {
  extractEntities,
  applyConfidenceGating,
  KNOWN_ASSETS,
} from '../resolver';

import {
  computeCoverage,
  computeQualityScore,
  calculateModuleFreshness,
  checkTimeCoherence,
  generateCoverageSummary,
} from '../coverage';

import {
  RESOLUTION_THRESHOLDS,
  EvidenceModules,
  TokenCandidate,
} from '../types';

// ============================================================================
// TOKEN RESOLUTION TESTS
// ============================================================================

describe('Token Resolution', () => {
  describe('extractEntities', () => {
    it('should extract $TICKER patterns', () => {
      const entities = extractEntities('What about $BTC and $ETH?');
      expect(entities.tickers).toContain('BTC');
      expect(entities.tickers).toContain('ETH');
    });

    it('should extract EVM addresses', () => {
      const entities = extractEntities('Check 0x1234567890123456789012345678901234567890');
      expect(entities.addresses).toHaveLength(1);
      expect(entities.addresses[0].chain).toBe('ethereum');
    });

    it('should extract DEXScreener URLs', () => {
      const entities = extractEntities('Look at https://dexscreener.com/solana/abc123');
      expect(entities.urls).toHaveLength(1);
      expect(entities.urls[0].type).toBe('dexscreener');
      expect(entities.urls[0].chain).toBe('solana');
    });

    it('should extract pump.fun URLs', () => {
      const entities = extractEntities('Check out pump.fun/coin/abc123');
      expect(entities.urls).toHaveLength(1);
      expect(entities.urls[0].type).toBe('pumpfun');
      expect(entities.urls[0].chain).toBe('solana');
    });

    it('should extract chain hints', () => {
      const entities = extractEntities('The token on Solana called PENGUIN');
      expect(entities.chainHints).toContain('solana');
    });

    it('should handle mixed entities', () => {
      const entities = extractEntities('$BTC on ethereum vs 0x1234567890123456789012345678901234567890');
      expect(entities.tickers).toContain('BTC');
      expect(entities.addresses).toHaveLength(1);
      expect(entities.chainHints).toContain('ethereum');
    });
  });

  describe('applyConfidenceGating', () => {
    it('should accept high-confidence single candidate', () => {
      const candidates: TokenCandidate[] = [
        { symbol: 'BTC', chain: 'bitcoin', address: null, confidence: 0.95 },
      ];
      const decision = applyConfidenceGating(candidates, 'known_asset');
      
      expect(decision.accepted).toBe(true);
      expect(decision.resolved?.symbol).toBe('BTC');
      expect(decision.resolved?.margin).toBe(1.0);
    });

    it('should accept when margin is sufficient', () => {
      const candidates: TokenCandidate[] = [
        { symbol: 'BTC', chain: 'bitcoin', address: null, confidence: 0.90 },
        { symbol: 'WBTC', chain: 'ethereum', address: '0x...', confidence: 0.70 },
      ];
      const decision = applyConfidenceGating(candidates, 'ticker_lookup');
      
      expect(decision.accepted).toBe(true);
      expect(decision.resolved?.margin).toBe(0.20);
    });

    it('should reject when confidence too low', () => {
      const candidates: TokenCandidate[] = [
        { symbol: 'PENGUIN', chain: 'solana', address: '...', confidence: 0.70 },
      ];
      const decision = applyConfidenceGating(candidates, 'ticker_lookup');
      
      expect(decision.accepted).toBe(false);
      expect(decision.clarifier).toBeDefined();
    });

    it('should reject when margin too small', () => {
      const candidates: TokenCandidate[] = [
        { symbol: 'PENGUIN', chain: 'solana', address: '...', confidence: 0.85 },
        { symbol: 'PENGUIN', chain: 'ethereum', address: '...', confidence: 0.80 },
      ];
      const decision = applyConfidenceGating(candidates, 'ticker_lookup');
      
      expect(decision.accepted).toBe(false);
      expect(decision.clarifier?.type).toBe('multiple_chains');
    });

    it('should force accept after max clarifier attempts', () => {
      const candidates: TokenCandidate[] = [
        { symbol: 'PENGUIN', chain: 'solana', address: '...', confidence: 0.70 },
      ];
      const decision = applyConfidenceGating(
        candidates,
        'ticker_lookup',
        RESOLUTION_THRESHOLDS.MAX_CLARIFIER_ATTEMPTS
      );
      
      expect(decision.accepted).toBe(true);
      expect(decision.reason).toBe('max_clarifier_attempts_exceeded');
    });

    it('should handle empty candidates', () => {
      const decision = applyConfidenceGating([], 'ticker_lookup');
      
      expect(decision.accepted).toBe(false);
      expect(decision.clarifier?.type).toBe('no_match');
    });
  });

  describe('KNOWN_ASSETS', () => {
    it('should have high confidence for majors', () => {
      expect(KNOWN_ASSETS['BTC'].confidence).toBe(1.0);
      expect(KNOWN_ASSETS['ETH'].confidence).toBe(1.0);
      expect(KNOWN_ASSETS['SOL'].confidence).toBe(1.0);
    });

    it('should include common variations', () => {
      expect(KNOWN_ASSETS['BITCOIN']).toBeDefined();
      expect(KNOWN_ASSETS['ETHEREUM']).toBeDefined();
      expect(KNOWN_ASSETS['SOLANA']).toBeDefined();
    });
  });
});

// ============================================================================
// COVERAGE COMPUTATION TESTS
// ============================================================================

describe('Coverage Computation', () => {
  const nowUnix = Math.floor(Date.now() / 1000);

  describe('calculateModuleFreshness', () => {
    it('should mark module as ok when fresh', () => {
      const result = calculateModuleFreshness(
        'dexscreener',
        { status: 'ok', ts: nowUnix - 30 },
        nowUnix
      );
      
      expect(result.status).toBe('ok');
      expect(result.freshness_seconds).toBe(30);
      expect(result.is_stale).toBe(false);
    });

    it('should mark module as stale when beyond TTL', () => {
      const result = calculateModuleFreshness(
        'dexscreener',  // TTL is 60s
        { status: 'ok', ts: nowUnix - 120 },
        nowUnix
      );
      
      expect(result.status).toBe('stale');
      expect(result.is_stale).toBe(true);
    });

    it('should mark module as missing when undefined', () => {
      const result = calculateModuleFreshness('security', undefined, nowUnix);
      
      expect(result.status).toBe('missing');
    });
  });

  describe('computeQualityScore', () => {
    it('should return 1.0 for perfect coverage', () => {
      const score = computeQualityScore(
        ['dexscreener', 'security', 'sentiment'],
        [],
        [],
        [],
        ['dexscreener'],
        true
      );
      
      expect(score).toBe(1.0);
    });

    it('should penalize missing required modules', () => {
      const score = computeQualityScore(
        ['sentiment'],
        ['dexscreener'],  // Missing required
        [],
        [],
        ['dexscreener'],
        true
      );
      
      expect(score).toBeLessThan(1.0);
      expect(score).toBeGreaterThan(0.5);
    });

    it('should penalize stale modules', () => {
      const fullScore = computeQualityScore(
        ['dexscreener'],
        [],
        [],
        [],
        ['dexscreener'],
        true
      );
      
      const staleScore = computeQualityScore(
        ['dexscreener'],
        [],
        ['dexscreener'],  // Stale
        [],
        ['dexscreener'],
        true
      );
      
      expect(staleScore).toBeLessThan(fullScore);
    });

    it('should penalize errors', () => {
      const score = computeQualityScore(
        [],
        [],
        [],
        ['dexscreener'],  // Error
        ['dexscreener'],
        true
      );
      
      expect(score).toBeLessThan(0.5);
    });

    it('should floor at 0', () => {
      const score = computeQualityScore(
        [],
        ['dexscreener', 'security', 'holders', 'sentiment', 'news'],
        [],
        [],
        ['dexscreener', 'security'],
        false
      );
      
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('checkTimeCoherence', () => {
    it('should return false when no time mismatch', () => {
      const evidence: EvidenceModules = {
        dexscreener: {
          status: 'ok',
          ts: nowUnix - 30,
          source: 'DexScreener',
          freshness_seconds: 30,
          data: null,
        },
        news: {
          status: 'ok',
          ts: nowUnix - 60,
          source: 'News',
          freshness_seconds: 60,
          data: null,
        },
      };

      expect(checkTimeCoherence(evidence, nowUnix)).toBe(false);
    });

    it('should return true when news is > 10 min older than price', () => {
      const evidence: EvidenceModules = {
        dexscreener: {
          status: 'ok',
          ts: nowUnix - 30,
          source: 'DexScreener',
          freshness_seconds: 30,
          data: null,
        },
        news: {
          status: 'ok',
          ts: nowUnix - 900,  // 15 min old
          source: 'News',
          freshness_seconds: 900,
          data: null,
        },
      };

      expect(checkTimeCoherence(evidence, nowUnix)).toBe(true);
    });
  });

  describe('generateCoverageSummary', () => {
    it('should generate human-readable summary', () => {
      const summary = generateCoverageSummary({
        available: ['dexscreener', 'sentiment'],
        missing: ['security', 'holders'],
        stale: [],
        errors: [],
        freshness_seconds: { dexscreener: 30, sentiment: 300 },
        quality_score: 0.75,
        time_disclosure_required: false,
      });

      expect(summary).toContain('Available: dexscreener, sentiment');
      expect(summary).toContain('Missing: security, holders');
      expect(summary).toContain('Quality: 75%');
    });

    it('should include time warning when needed', () => {
      const summary = generateCoverageSummary({
        available: ['dexscreener'],
        missing: [],
        stale: [],
        errors: [],
        freshness_seconds: { dexscreener: 30 },
        quality_score: 0.9,
        time_disclosure_required: true,
      });

      expect(summary).toContain('Time mismatch');
    });
  });

  describe('computeCoverage', () => {
    it('should compute full coverage analysis', () => {
      const evidence: EvidenceModules = {
        dexscreener: {
          status: 'ok',
          ts: nowUnix - 30,
          source: 'DexScreener',
          freshness_seconds: 30,
          data: null,
        },
      };

      const { coverage, analysis } = computeCoverage(
        evidence,
        'TOKEN_ANALYSIS',
        true,
        nowUnix
      );

      expect(coverage.available).toContain('dexscreener');
      expect(coverage.quality_score).toBeGreaterThan(0);
      expect(analysis.availableCount).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS (Golden Cases)
// ============================================================================

describe('Evidence Pack Integration', () => {
  describe('Golden Test Cases', () => {
    it('should handle "Why is BTC down today?"', () => {
      const entities = extractEntities('Why is BTC down today?');
      expect(entities.tickers).toContain('BTC');
    });

    it('should handle "$PENGUIN analysis"', () => {
      const entities = extractEntities('Analyze $PENGUIN');
      expect(entities.tickers).toContain('PENGUIN');
    });

    it('should handle "market overview"', () => {
      const entities = extractEntities('Give me a market overview');
      expect(entities.tickers).toHaveLength(0);  // No specific token
    });

    it('should handle DEX URL', () => {
      const entities = extractEntities('Look at https://dexscreener.com/solana/abc123pump');
      expect(entities.urls).toHaveLength(1);
      expect(entities.urls[0].chain).toBe('solana');
    });
  });
});
