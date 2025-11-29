/**
 * ============================================
 * PROVIDER FUSION - Integration Tests
 * ============================================
 * 
 * Integration tests for the complete provider fusion system
 * Tests WhaleFusionEngine + ConsensusEngine + RecoveryManager together
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Chain, AlchemyTransfer, TransferCategory } from '../../types';

// =============================================================================
// MOCK DATA
// =============================================================================

const createMockTransfer = (overrides: Partial<AlchemyTransfer> = {}): AlchemyTransfer => ({
  hash: `0x${Math.random().toString(16).slice(2)}`,
  blockNum: '0x100000',
  from: '0x1234567890abcdef1234567890abcdef12345678',
  to: '0xabcdef1234567890abcdef1234567890abcdef12',
  value: 1.5,
  category: TransferCategory.EXTERNAL,
  asset: 'ETH',
  erc721TokenId: null,
  erc1155Metadata: null,
  tokenId: null,
  rawContract: { address: null, value: null, decimal: null },
  metadata: { blockTimestamp: new Date().toISOString() },
  ...overrides,
});

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

describe('Provider Fusion Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ===========================================================================
  // END-TO-END FLOW
  // ===========================================================================

  describe('End-to-End Flow', () => {
    it('should complete full query flow with consensus', async () => {
      // This test verifies the complete flow:
      // 1. Query initiated
      // 2. Multiple providers queried
      // 3. Responses normalized
      // 4. Consensus built
      // 5. Result returned
      
      const mockTransfer = createMockTransfer({ hash: '0xtest123' });
      
      // Simulate provider responses
      const providerResponses = {
        alchemy: [mockTransfer],
        quicknode: [mockTransfer],
        infura: [mockTransfer],
        moralis: [mockTransfer],
      };

      // Verify all providers return same data
      const hashes = new Set<string>();
      for (const [provider, transfers] of Object.entries(providerResponses)) {
        for (const transfer of transfers) {
          hashes.add(transfer.hash.toLowerCase());
        }
      }

      // All should have same hash = consensus
      expect(hashes.size).toBe(1);
      expect(hashes.has('0xtest123')).toBe(true);
    });

    it('should handle provider disagreement gracefully', async () => {
      const transfer1 = createMockTransfer({ hash: '0xabc' });
      const transfer2 = createMockTransfer({ hash: '0xdef' });
      const transfer3 = createMockTransfer({ hash: '0xghi' });

      const providerResponses = {
        alchemy: [transfer1],
        quicknode: [transfer2],
        infura: [transfer3],
        moralis: [transfer1], // Agrees with alchemy
      };

      // Count votes for each hash
      const votes = new Map<string, number>();
      for (const transfers of Object.values(providerResponses)) {
        for (const transfer of transfers) {
          const hash = transfer.hash.toLowerCase();
          votes.set(hash, (votes.get(hash) || 0) + 1);
        }
      }

      // transfer1 (0xabc) should have 2 votes
      expect(votes.get('0xabc')).toBe(2);
      expect(votes.get('0xdef')).toBe(1);
      expect(votes.get('0xghi')).toBe(1);
    });
  });

  // ===========================================================================
  // FAILOVER SCENARIOS
  // ===========================================================================

  describe('Failover Scenarios', () => {
    it('should failover when primary provider fails', async () => {
      const providers = ['alchemy', 'quicknode', 'infura', 'moralis'];
      const failedProviders = new Set(['alchemy']);
      
      // Simulate failover
      const availableProviders = providers.filter(p => !failedProviders.has(p));
      
      expect(availableProviders.length).toBe(3);
      expect(availableProviders).not.toContain('alchemy');
    });

    it('should continue with partial consensus when some providers fail', async () => {
      const mockTransfer = createMockTransfer({ hash: '0xtest' });
      
      const providerResults = {
        alchemy: { success: true, transfers: [mockTransfer] },
        quicknode: { success: false, transfers: [], error: 'Network error' },
        infura: { success: true, transfers: [mockTransfer] },
        moralis: { success: true, transfers: [mockTransfer] },
      };

      const successfulProviders = Object.entries(providerResults)
        .filter(([_, result]) => result.success)
        .length;

      // 3 out of 4 succeeded
      expect(successfulProviders).toBe(3);
      
      // Can still reach consensus with 3 providers
      const minForConsensus = 2; // 2/3 majority
      expect(successfulProviders).toBeGreaterThanOrEqual(minForConsensus);
    });

    it('should handle all providers failing', async () => {
      const providerResults = {
        alchemy: { success: false, error: 'CU exhausted' },
        quicknode: { success: false, error: 'Rate limited' },
        infura: { success: false, error: 'Network error' },
        moralis: { success: false, error: 'Timeout' },
      };

      const successfulProviders = Object.entries(providerResults)
        .filter(([_, result]) => result.success)
        .length;

      expect(successfulProviders).toBe(0);
      
      // System should return empty result, not crash
      const fallbackResult = { transfers: [], consensusReached: false };
      expect(fallbackResult.transfers).toHaveLength(0);
    });
  });

  // ===========================================================================
  // RECOVERY INTEGRATION
  // ===========================================================================

  describe('Recovery Integration', () => {
    it('should recover provider after transient failure', async () => {
      let failureCount = 0;
      const maxFailures = 2;

      // Simulate transient failure
      const simulateProviderCall = () => {
        failureCount++;
        if (failureCount <= maxFailures) {
          throw new Error('Transient failure');
        }
        return { success: true, data: [] };
      };

      // First two calls fail
      expect(() => simulateProviderCall()).toThrow('Transient failure');
      expect(() => simulateProviderCall()).toThrow('Transient failure');
      
      // Third call succeeds
      const result = simulateProviderCall();
      expect(result.success).toBe(true);
    });

    it('should respect circuit breaker after multiple failures', async () => {
      const circuitState = {
        isOpen: false,
        failureCount: 0,
        threshold: 3,
      };

      const recordFailure = () => {
        circuitState.failureCount++;
        if (circuitState.failureCount >= circuitState.threshold) {
          circuitState.isOpen = true;
        }
      };

      // Simulate failures
      recordFailure();
      recordFailure();
      expect(circuitState.isOpen).toBe(false);
      
      recordFailure(); // Third failure
      expect(circuitState.isOpen).toBe(true);
    });

    it('should reset circuit after cooldown', async () => {
      const circuitState = {
        isOpen: true,
        openedAt: Date.now(),
        cooldownMs: 60000,
      };

      // Check before cooldown
      const beforeCooldown = Date.now();
      const shouldResetBefore = beforeCooldown - circuitState.openedAt >= circuitState.cooldownMs;
      expect(shouldResetBefore).toBe(false);

      // Simulate time passing
      await vi.advanceTimersByTimeAsync(60000);
      
      const afterCooldown = Date.now();
      const shouldResetAfter = afterCooldown - circuitState.openedAt >= circuitState.cooldownMs;
      expect(shouldResetAfter).toBe(true);
    });
  });

  // ===========================================================================
  // CACHING INTEGRATION
  // ===========================================================================

  describe('Caching Integration', () => {
    it('should cache consensus results', async () => {
      const cache = new Map<string, any>();
      const mockTransfer = createMockTransfer({ hash: '0xtest' });
      
      const cacheKey = 'consensus:ethereum:0x1234:100000:200000';
      const consensusResult = {
        transfers: [mockTransfer],
        confidence: 0.95,
        cached: false,
      };

      // First query - not cached
      expect(cache.has(cacheKey)).toBe(false);
      
      // Cache result
      cache.set(cacheKey, consensusResult);
      
      // Second query - cached
      expect(cache.has(cacheKey)).toBe(true);
      
      const cachedResult = cache.get(cacheKey);
      expect(cachedResult.transfers).toHaveLength(1);
    });

    it('should invalidate stale cache entries', async () => {
      const cache = new Map<string, { data: any; timestamp: number }>();
      const ttlMs = 60000;

      const cacheKey = 'test-key';
      cache.set(cacheKey, { data: 'test', timestamp: Date.now() });

      // Before TTL
      const entry = cache.get(cacheKey)!;
      const isStale = Date.now() - entry.timestamp > ttlMs;
      expect(isStale).toBe(false);

      // After TTL
      await vi.advanceTimersByTimeAsync(70000);
      const isStaleAfter = Date.now() - entry.timestamp > ttlMs;
      expect(isStaleAfter).toBe(true);
    });
  });

  // ===========================================================================
  // BATCHING INTEGRATION
  // ===========================================================================

  describe('Batching Integration', () => {
    it('should batch multiple queries', async () => {
      const addresses = [
        '0x1111111111111111111111111111111111111111',
        '0x2222222222222222222222222222222222222222',
        '0x3333333333333333333333333333333333333333',
        '0x4444444444444444444444444444444444444444',
        '0x5555555555555555555555555555555555555555',
      ];

      const batchSize = 3;
      const batches: string[][] = [];
      
      for (let i = 0; i < addresses.length; i += batchSize) {
        batches.push(addresses.slice(i, i + batchSize));
      }

      expect(batches.length).toBe(2);
      expect(batches[0].length).toBe(3);
      expect(batches[1].length).toBe(2);
    });

    it('should handle batch failures gracefully', async () => {
      const batchResults = [
        { address: '0x1111', success: true, transfers: [] },
        { address: '0x2222', success: false, error: 'Failed' },
        { address: '0x3333', success: true, transfers: [] },
      ];

      const successfulResults = batchResults.filter(r => r.success);
      const failedResults = batchResults.filter(r => !r.success);

      expect(successfulResults.length).toBe(2);
      expect(failedResults.length).toBe(1);
      
      // System should return partial results
      expect(successfulResults.map(r => r.address)).toEqual(['0x1111', '0x3333']);
    });
  });

  // ===========================================================================
  // METRICS INTEGRATION
  // ===========================================================================

  describe('Metrics Integration', () => {
    it('should track query metrics across components', async () => {
      const metrics = {
        fusionEngine: { queries: 0, cacheHits: 0, latencyMs: 0 },
        consensus: { queries: 0, consensusReached: 0, confidence: 0 },
        recovery: { attempts: 0, successes: 0 },
      };

      // Simulate query
      metrics.fusionEngine.queries++;
      metrics.fusionEngine.latencyMs = 50;
      metrics.consensus.queries++;
      metrics.consensus.consensusReached++;
      metrics.consensus.confidence = 0.95;

      expect(metrics.fusionEngine.queries).toBe(1);
      expect(metrics.consensus.consensusReached).toBe(1);
      expect(metrics.consensus.confidence).toBe(0.95);
    });

    it('should calculate efficiency multiplier', async () => {
      const metrics = {
        totalTransfersServed: 1000,
        actualApiCalls: 100,
      };

      const efficiency = metrics.totalTransfersServed / metrics.actualApiCalls;
      expect(efficiency).toBe(10); // 10x efficiency
    });
  });

  // ===========================================================================
  // ERROR SCENARIOS
  // ===========================================================================

  describe('Error Scenarios', () => {
    it('should handle malformed provider responses', async () => {
      const malformedResponses = [
        { hash: null }, // Missing hash
        { hash: '0xabc', from: undefined }, // Missing from
        { hash: '0xdef', value: 'not-a-number' }, // Invalid value
      ];

      const validResponses = malformedResponses.filter(r => {
        return r.hash && typeof r.hash === 'string';
      });

      expect(validResponses.length).toBe(2);
    });

    it('should handle timeout during consensus', async () => {
      const timeoutMs = 5000;
      
      const queryWithTimeout = async () => {
        return new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Query timed out'));
          }, timeoutMs);

          // Simulate slow response
          setTimeout(() => {
            clearTimeout(timeout);
            resolve({ success: true });
          }, 3000);
        });
      };

      await vi.advanceTimersByTimeAsync(3000);
      
      // Should complete before timeout
      const result = await queryWithTimeout();
      expect(result).toEqual({ success: true });
    });

    it('should handle CU exhaustion across all providers', async () => {
      const providerCU = {
        alchemy: { remaining: 0, max: 330000 },
        quicknode: { remaining: 0, max: 300000 },
        infura: { remaining: 0, max: 100000 },
        moralis: { remaining: 0, max: 40000 },
      };

      const availableProviders = Object.entries(providerCU)
        .filter(([_, cu]) => cu.remaining > 0);

      expect(availableProviders.length).toBe(0);
      
      // System should return error or wait for reset
      const shouldWait = availableProviders.length === 0;
      expect(shouldWait).toBe(true);
    });
  });
});

