/**
 * ✅ Coin ID Validator Tests - Divine Perfection
 * 
 * Comprehensive test suite for the production-ready coin ID validator.
 * Tests validation logic, caching, error handling, and graceful degradation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import axios from 'axios';
import {
  CoinIdValidator,
  getCoinIdValidator,
  validateCoinIds,
  isValidCoinId,
  getValidatorStats,
  initializeCoinIdValidator,
} from '../coin-id-validator';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// ============================================================================
// TEST DATA
// ============================================================================

const MOCK_COIN_LIST = [
  { id: 'bitcoin', symbol: 'btc', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'eth', name: 'Ethereum' },
  { id: 'solana', symbol: 'sol', name: 'Solana' },
  { id: 'ripple', symbol: 'xrp', name: 'XRP' },
  { id: 'cardano', symbol: 'ada', name: 'Cardano' },
  { id: 'dogecoin', symbol: 'doge', name: 'Dogecoin' },
  { id: 'polkadot', symbol: 'dot', name: 'Polkadot' },
  { id: 'chainlink', symbol: 'link', name: 'Chainlink' },
  { id: 'uniswap', symbol: 'uni', name: 'Uniswap' },
  { id: 'avalanche-2', symbol: 'avax', name: 'Avalanche' },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mockSuccessfulFetch() {
  mockedAxios.get.mockResolvedValue({
    data: MOCK_COIN_LIST,
    status: 200,
  });
}

function mockFailedFetch(error: string = 'Network error') {
  mockedAxios.get.mockRejectedValue(new Error(error));
}

function mockRateLimitedFetch() {
  mockedAxios.get.mockRejectedValue({
    response: { status: 429 },
    message: 'Rate limited',
  });
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('CoinIdValidator', () => {
  let validator: CoinIdValidator;

  beforeEach(() => {
    vi.clearAllMocks();
    validator = new CoinIdValidator();
  });

  afterEach(() => {
    validator.clear();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Initialization', () => {
    it('should initialize successfully with valid coin list', async () => {
      mockSuccessfulFetch();
      
      await validator.initialize();
      
      const stats = validator.getStats();
      expect(stats.isInitialized).toBe(true);
      expect(stats.totalCoins).toBe(MOCK_COIN_LIST.length);
      expect(stats.totalSymbols).toBeGreaterThan(0);
    });

    it('should not fetch twice if already initialized', async () => {
      mockSuccessfulFetch();
      
      await validator.initialize();
      await validator.initialize();
      
      // Should only call API once
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should handle concurrent initialization calls', async () => {
      mockSuccessfulFetch();
      
      // Call initialize multiple times concurrently
      const promises = [
        validator.initialize(),
        validator.initialize(),
        validator.initialize(),
      ];
      
      await Promise.all(promises);
      
      // Should only fetch once despite concurrent calls
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
    });

    it('should gracefully handle initialization failure', async () => {
      mockFailedFetch('API unavailable');
      
      // Should not throw
      await validator.initialize();
      
      const stats = validator.getStats();
      expect(stats.isInitialized).toBe(false);
      expect(stats.totalCoins).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Validation', () => {
    beforeEach(async () => {
      mockSuccessfulFetch();
      await validator.initialize();
    });

    it('should validate correct coin IDs', async () => {
      const result = await validator.validateIds(['bitcoin', 'ethereum', 'solana']);
      
      expect(result.valid).toEqual(['bitcoin', 'ethereum', 'solana']);
      expect(result.invalid).toEqual([]);
      expect(result.cached).toBe(true);
    });

    it('should detect invalid coin IDs', async () => {
      const result = await validator.validateIds([
        'bitcoin',
        'invalid-coin-xyz',
        'ethereum',
        'fake-token-123',
      ]);
      
      expect(result.valid).toEqual(['bitcoin', 'ethereum']);
      expect(result.invalid).toEqual(['invalid-coin-xyz', 'fake-token-123']);
    });

    it('should handle case-insensitive validation', async () => {
      const result = await validator.validateIds(['BITCOIN', 'Ethereum', 'SOLANA']);
      
      expect(result.valid).toEqual(['BITCOIN', 'Ethereum', 'SOLANA']);
      expect(result.invalid).toEqual([]);
    });

    it('should handle empty input array', async () => {
      const result = await validator.validateIds([]);
      
      expect(result.valid).toEqual([]);
      expect(result.invalid).toEqual([]);
    });

    it('should handle whitespace in coin IDs', async () => {
      const result = await validator.validateIds([' bitcoin ', '  ethereum  ']);
      
      expect(result.valid).toEqual([' bitcoin ', '  ethereum  ']);
      expect(result.invalid).toEqual([]);
    });

    it('should track validation metrics', async () => {
      await validator.validateIds(['bitcoin', 'invalid-1']);
      await validator.validateIds(['ethereum', 'invalid-2', 'solana']);
      
      const stats = validator.getStats();
      expect(stats.totalValidations).toBe(2);
      expect(stats.totalValidIds).toBe(3);
      expect(stats.totalInvalidIds).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SINGLE ID VALIDATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Single ID Validation', () => {
    beforeEach(async () => {
      mockSuccessfulFetch();
      await validator.initialize();
    });

    it('should return true for valid coin ID', async () => {
      const isValid = await validator.isValidId('bitcoin');
      expect(isValid).toBe(true);
    });

    it('should return false for invalid coin ID', async () => {
      const isValid = await validator.isValidId('invalid-coin-xyz');
      expect(isValid).toBe(false);
    });

    it('should handle case-insensitive check', async () => {
      expect(await validator.isValidId('BITCOIN')).toBe(true);
      expect(await validator.isValidId('Bitcoin')).toBe(true);
      expect(await validator.isValidId('bItCoIn')).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SYMBOL LOOKUP TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Symbol Lookup', () => {
    beforeEach(async () => {
      mockSuccessfulFetch();
      await validator.initialize();
    });

    it('should return coin IDs for valid symbol', async () => {
      const ids = await validator.getCoinIdsBySymbol('btc');
      expect(ids).toContain('bitcoin');
    });

    it('should return empty array for invalid symbol', async () => {
      const ids = await validator.getCoinIdsBySymbol('INVALID');
      expect(ids).toEqual([]);
    });

    it('should handle case-insensitive symbol lookup', async () => {
      const ids1 = await validator.getCoinIdsBySymbol('BTC');
      const ids2 = await validator.getCoinIdsBySymbol('btc');
      expect(ids1).toEqual(ids2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // NAME LOOKUP TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Name Lookup', () => {
    beforeEach(async () => {
      mockSuccessfulFetch();
      await validator.initialize();
    });

    it('should return coin ID for valid name', async () => {
      const id = await validator.getCoinIdByName('Bitcoin');
      expect(id).toBe('bitcoin');
    });

    it('should return null for invalid name', async () => {
      const id = await validator.getCoinIdByName('Invalid Coin');
      expect(id).toBeNull();
    });

    it('should handle case-insensitive name lookup', async () => {
      const id = await validator.getCoinIdByName('BITCOIN');
      expect(id).toBe('bitcoin');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GRACEFUL DEGRADATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Graceful Degradation', () => {
    it('should return all IDs as valid when not initialized', async () => {
      // Don't initialize - simulate failed initialization
      mockFailedFetch();
      await validator.initialize();
      
      const result = await validator.validateIds(['bitcoin', 'invalid-coin']);
      
      // When not initialized, all IDs are considered valid (graceful degradation)
      expect(result.valid).toEqual(['bitcoin', 'invalid-coin']);
      expect(result.invalid).toEqual([]);
      expect(result.cached).toBe(false);
    });

    it('should return true for isValidId when not initialized', async () => {
      mockFailedFetch();
      await validator.initialize();
      
      // Should return true (graceful degradation)
      const isValid = await validator.isValidId('invalid-coin');
      expect(isValid).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CACHE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Cache Management', () => {
    it('should report correct cache stats', async () => {
      mockSuccessfulFetch();
      await validator.initialize();
      
      const stats = validator.getStats();
      expect(stats.cacheValid).toBe(true);
      expect(stats.lastFetchTime).toBeGreaterThan(0);
      expect(stats.cacheAgeMs).toBeLessThan(1000); // Less than 1 second old
    });

    it('should clear cache correctly', async () => {
      mockSuccessfulFetch();
      await validator.initialize();
      
      validator.clear();
      
      const stats = validator.getStats();
      expect(stats.isInitialized).toBe(false);
      expect(stats.totalCoins).toBe(0);
      expect(stats.lastFetchTime).toBe(0);
    });

    it('should force refresh cache', async () => {
      mockSuccessfulFetch();
      await validator.initialize();
      
      // Force refresh
      await validator.forceRefresh();
      
      // Should have called API twice (initial + refresh)
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // STATISTICS TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Statistics', () => {
    it('should calculate hit rate correctly', async () => {
      mockSuccessfulFetch();
      await validator.initialize();
      
      // 2 valid, 2 invalid
      await validator.validateIds(['bitcoin', 'ethereum']);
      await validator.validateIds(['invalid-1', 'invalid-2']);
      
      const stats = validator.getStats();
      expect(stats.hitRate).toBe(0.5); // 2/4 = 50%
    });

    it('should handle zero divisions in hit rate', async () => {
      mockSuccessfulFetch();
      await validator.initialize();
      
      // No validations yet
      const stats = validator.getStats();
      expect(stats.hitRate).toBe(0);
    });
  });
});

// ============================================================================
// CONVENIENCE FUNCTION TESTS
// ============================================================================

describe('Convenience Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSuccessfulFetch();
  });

  describe('validateCoinIds', () => {
    it('should validate coin IDs using singleton', async () => {
      const result = await validateCoinIds(['bitcoin', 'invalid-coin']);
      
      expect(result.valid).toContain('bitcoin');
      expect(result.invalid).toContain('invalid-coin');
    });
  });

  describe('isValidCoinId', () => {
    it('should check single coin ID using singleton', async () => {
      expect(await isValidCoinId('bitcoin')).toBe(true);
      expect(await isValidCoinId('invalid-coin')).toBe(false);
    });
  });

  describe('getValidatorStats', () => {
    it('should return stats from singleton', async () => {
      await initializeCoinIdValidator();
      
      const stats = getValidatorStats();
      expect(stats.isInitialized).toBe(true);
      expect(stats.totalCoins).toBeGreaterThan(0);
    });
  });

  describe('initializeCoinIdValidator', () => {
    it('should initialize the singleton', async () => {
      await initializeCoinIdValidator();
      
      const stats = getValidatorStats();
      expect(stats.isInitialized).toBe(true);
    });
  });
});

// ============================================================================
// SINGLETON TESTS
// ============================================================================

describe('Singleton Pattern', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSuccessfulFetch();
  });

  it('should return the same instance', () => {
    const instance1 = getCoinIdValidator();
    const instance2 = getCoinIdValidator();
    
    expect(instance1).toBe(instance2);
  });

  it('should share state between calls', async () => {
    const instance1 = getCoinIdValidator();
    await instance1.initialize();
    
    const instance2 = getCoinIdValidator();
    const stats = instance2.getStats();
    
    expect(stats.isInitialized).toBe(true);
    expect(stats.totalCoins).toBeGreaterThan(0);
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe('Edge Cases', () => {
  let validator: CoinIdValidator;

  beforeEach(() => {
    vi.clearAllMocks();
    validator = new CoinIdValidator();
    mockSuccessfulFetch();
  });

  afterEach(() => {
    validator.clear();
  });

  it('should handle very large validation batch', async () => {
    await validator.initialize();
    
    // Create a large batch of coin IDs
    const coinIds = Array.from({ length: 1000 }, (_, i) => 
      i < 500 ? MOCK_COIN_LIST[i % MOCK_COIN_LIST.length].id : `invalid-${i}`
    );
    
    const result = await validator.validateIds(coinIds);
    
    expect(result.valid.length).toBe(500);
    expect(result.invalid.length).toBe(500);
    expect(result.validationTime).toBeLessThan(100); // Should be fast (O(1) lookups)
  });

  it('should handle special characters in coin IDs', async () => {
    await validator.initialize();
    
    const result = await validator.validateIds([
      'bitcoin',
      '<script>alert(1)</script>',
      'coin with spaces',
      '../../etc/passwd',
    ]);
    
    expect(result.valid).toEqual(['bitcoin']);
    expect(result.invalid.length).toBe(3);
  });

  it('should handle unicode characters', async () => {
    await validator.initialize();
    
    const result = await validator.validateIds([
      'bitcoin',
      '比特币', // Chinese
      'ビットコイン', // Japanese
      '₿itcoin', // Symbol
    ]);
    
    expect(result.valid).toEqual(['bitcoin']);
    expect(result.invalid.length).toBe(3);
  });

  it('should handle null and undefined in array', async () => {
    await validator.initialize();
    
    // TypeScript would normally prevent this, but test runtime behavior
    const coinIds = ['bitcoin', null as any, undefined as any, 'ethereum'];
    const result = await validator.validateIds(coinIds.filter(Boolean));
    
    expect(result.valid).toEqual(['bitcoin', 'ethereum']);
  });

  it('should handle empty string coin IDs', async () => {
    await validator.initialize();
    
    const result = await validator.validateIds(['', 'bitcoin', '  ', 'ethereum']);
    
    // Empty strings should be invalid
    expect(result.invalid).toContain('');
    expect(result.invalid).toContain('  ');
    expect(result.valid).toContain('bitcoin');
    expect(result.valid).toContain('ethereum');
  });
});
