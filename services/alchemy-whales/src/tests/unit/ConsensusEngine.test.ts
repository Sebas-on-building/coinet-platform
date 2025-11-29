/**
 * ============================================
 * CONSENSUS ENGINE - Unit Tests
 * ============================================
 * 
 * Comprehensive test coverage for the ConsensusEngine
 * Target: 95%+ code coverage
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  ConsensusEngine, 
  ConsensusConfig, 
  NormalizedTransfer,
  ConsensusResult,
  resetConsensusEngine 
} from '../../clients/ConsensusEngine';
import { WhaleFusionEngine, ProviderName, FusionResult } from '../../clients/WhaleFusionEngine';
import { Chain, AlchemyTransfer, TransferCategory } from '../../types';

// =============================================================================
// MOCKS
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

const createMockFusionEngine = (config: {
  activeProviders?: ProviderName[];
  transfersByProvider?: Partial<Record<ProviderName, AlchemyTransfer[]>>;
  shouldFail?: ProviderName[];
} = {}): WhaleFusionEngine => {
  const activeProviders = config.activeProviders || ['alchemy', 'quicknode', 'infura', 'moralis'];
  const transfersByProvider = config.transfersByProvider || {};
  const shouldFail = config.shouldFail || [];

  return {
    getActiveProviders: vi.fn(() => activeProviders),
    getTransfers: vi.fn(async (query: any) => {
      // Return from first available provider
      for (const provider of activeProviders) {
        if (!shouldFail.includes(provider)) {
          return {
            data: (transfersByProvider[provider] as AlchemyTransfer[]) || [],
            provider,
            cached: false,
            latencyMs: 50,
          };
        }
      }
      throw new Error('All providers failed');
    }),
  } as unknown as WhaleFusionEngine;
};

// =============================================================================
// TESTS
// =============================================================================

describe('ConsensusEngine', () => {
  let engine: ConsensusEngine;
  let mockFusionEngine: WhaleFusionEngine;

  beforeEach(() => {
    resetConsensusEngine();
  });

  afterEach(() => {
    resetConsensusEngine();
  });

  // ===========================================================================
  // INITIALIZATION
  // ===========================================================================

  describe('Initialization', () => {
    it('should initialize with default config', () => {
      mockFusionEngine = createMockFusionEngine();
      engine = new ConsensusEngine(mockFusionEngine);

      expect(engine).toBeDefined();
    });

    it('should initialize with custom config', () => {
      mockFusionEngine = createMockFusionEngine();
      const config: Partial<ConsensusConfig> = {
        minProviders: 2,
        minAgreementRatio: 0.5,
        auditEnabled: false,
      };
      
      engine = new ConsensusEngine(mockFusionEngine, config);

      expect(engine).toBeDefined();
    });
  });

  // ===========================================================================
  // CONSENSUS BUILDING
  // ===========================================================================

  describe('Consensus Building', () => {
    it('should reach consensus when all providers agree', async () => {
      const transfer = createMockTransfer({ hash: '0xabc123' });
      
      mockFusionEngine = createMockFusionEngine({
        activeProviders: ['alchemy', 'quicknode', 'infura'],
        transfersByProvider: {
          alchemy: [transfer],
          quicknode: [transfer],
          infura: [transfer],
        },
      });

      engine = new ConsensusEngine(mockFusionEngine);

      const result = await engine.getTransfersWithConsensus({
        chain: Chain.ETHEREUM,
        address: '0x1234',
      });

      expect(result.consensusReached).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.66);
      expect(result.transfers.length).toBe(1);
    });

    it('should reach consensus with 2/3 agreement', async () => {
      const transfer1 = createMockTransfer({ hash: '0xabc123' });
      const transfer2 = createMockTransfer({ hash: '0xdef456' });

      mockFusionEngine = createMockFusionEngine({
        activeProviders: ['alchemy', 'quicknode', 'infura'],
        transfersByProvider: {
          alchemy: [transfer1],
          quicknode: [transfer1],
          infura: [transfer2], // Different transfer
        },
      });

      engine = new ConsensusEngine(mockFusionEngine);

      const result = await engine.getTransfersWithConsensus({
        chain: Chain.ETHEREUM,
        address: '0x1234',
      });

      expect(result.consensusReached).toBe(true);
      expect(result.transfers.length).toBe(1);
      expect(result.transfers[0].hash).toBe('0xabc123');
    });

    it('should fail consensus when providers disagree', async () => {
      const transfer1 = createMockTransfer({ hash: '0xabc123' });
      const transfer2 = createMockTransfer({ hash: '0xdef456' });
      const transfer3 = createMockTransfer({ hash: '0xghi789' });

      mockFusionEngine = createMockFusionEngine({
        activeProviders: ['alchemy', 'quicknode', 'infura'],
        transfersByProvider: {
          alchemy: [transfer1],
          quicknode: [transfer2],
          infura: [transfer3],
        },
      });

      engine = new ConsensusEngine(mockFusionEngine);

      const result = await engine.getTransfersWithConsensus({
        chain: Chain.ETHEREUM,
        address: '0x1234',
      });

      expect(result.consensusReached).toBe(false);
      expect(result.transfers.length).toBe(0);
    });

    it('should handle empty responses', async () => {
      mockFusionEngine = createMockFusionEngine({
        activeProviders: ['alchemy', 'quicknode', 'infura'],
        transfersByProvider: {
          alchemy: [],
          quicknode: [],
          infura: [],
        },
      });

      engine = new ConsensusEngine(mockFusionEngine);

      const result = await engine.getTransfersWithConsensus({
        chain: Chain.ETHEREUM,
        address: '0x1234',
      });

      expect(result.consensusReached).toBe(true);
      expect(result.transfers.length).toBe(0);
      expect(result.confidence).toBe(1);
    });
  });

  // ===========================================================================
  // NORMALIZATION
  // ===========================================================================

  describe('Transfer Normalization', () => {
    it('should normalize transfer hashes to lowercase', async () => {
      const transfer = createMockTransfer({ 
        hash: '0xABC123DEF456' 
      });

      mockFusionEngine = createMockFusionEngine({
        activeProviders: ['alchemy', 'quicknode', 'infura'],
        transfersByProvider: {
          alchemy: [transfer],
          quicknode: [{ ...transfer, hash: '0xabc123def456' }],
          infura: [transfer],
        },
      });

      engine = new ConsensusEngine(mockFusionEngine);

      const result = await engine.getTransfersWithConsensus({
        chain: Chain.ETHEREUM,
        address: '0x1234',
      });

      expect(result.transfers.length).toBe(1);
      expect(result.transfers[0].hash).toBe('0xabc123def456');
    });

    it('should normalize addresses to lowercase', async () => {
      const transfer = createMockTransfer({
        from: '0xABCDEF1234567890ABCDEF1234567890ABCDEF12',
        to: '0x1234567890ABCDEF1234567890ABCDEF12345678',
      });

      mockFusionEngine = createMockFusionEngine({
        activeProviders: ['alchemy', 'quicknode', 'infura'],
        transfersByProvider: {
          alchemy: [transfer],
          quicknode: [transfer],
          infura: [transfer],
        },
      });

      engine = new ConsensusEngine(mockFusionEngine);

      const result = await engine.getTransfersWithConsensus({
        chain: Chain.ETHEREUM,
        address: '0x1234',
      });

      expect(result.transfers[0].from).toBe('0xabcdef1234567890abcdef1234567890abcdef12');
      expect(result.transfers[0].to).toBe('0x1234567890abcdef1234567890abcdef12345678');
    });

    it('should handle hex block numbers', async () => {
      const transfer = createMockTransfer({ 
        blockNum: '0x1000000' // 16777216 in decimal
      });

      mockFusionEngine = createMockFusionEngine({
        activeProviders: ['alchemy', 'quicknode', 'infura'],
        transfersByProvider: {
          alchemy: [transfer],
          quicknode: [transfer],
          infura: [transfer],
        },
      });

      engine = new ConsensusEngine(mockFusionEngine);

      const result = await engine.getTransfersWithConsensus({
        chain: Chain.ETHEREUM,
        address: '0x1234',
      });

      expect(result.transfers[0].blockNumber).toBe(16777216);
    });
  });

  // ===========================================================================
  // FALLBACK
  // ===========================================================================

  describe('Fallback Behavior', () => {
    it('should fallback to single provider when insufficient providers', async () => {
      const transfer = createMockTransfer();

      mockFusionEngine = createMockFusionEngine({
        activeProviders: ['alchemy'], // Only 1 provider
        transfersByProvider: {
          alchemy: [transfer],
        },
      });

      engine = new ConsensusEngine(mockFusionEngine, { minProviders: 3 });

      const result = await engine.getTransfersWithConsensus({
        chain: Chain.ETHEREUM,
        address: '0x1234',
      });

      expect(result.consensusReached).toBe(false);
      expect(result.confidence).toBe(0.5); // Lower confidence for single provider
      expect(result.transfers.length).toBe(1);
    });
  });

  // ===========================================================================
  // CONFIDENCE SCORING
  // ===========================================================================

  describe('Confidence Scoring', () => {
    it('should calculate high confidence for full agreement', async () => {
      const transfer = createMockTransfer();

      mockFusionEngine = createMockFusionEngine({
        activeProviders: ['alchemy', 'quicknode', 'infura', 'moralis'],
        transfersByProvider: {
          alchemy: [transfer],
          quicknode: [transfer],
          infura: [transfer],
          moralis: [transfer],
        },
      });

      engine = new ConsensusEngine(mockFusionEngine);

      const result = await engine.getTransfersWithConsensus({
        chain: Chain.ETHEREUM,
        address: '0x1234',
      });

      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should calculate lower confidence for partial agreement', async () => {
      const transfer1 = createMockTransfer({ hash: '0xabc123' });
      const transfer2 = createMockTransfer({ hash: '0xdef456' });

      mockFusionEngine = createMockFusionEngine({
        activeProviders: ['alchemy', 'quicknode', 'infura', 'moralis'],
        transfersByProvider: {
          alchemy: [transfer1],
          quicknode: [transfer1],
          infura: [transfer1],
          moralis: [transfer2], // Disagrees
        },
      });

      engine = new ConsensusEngine(mockFusionEngine);

      const result = await engine.getTransfersWithConsensus({
        chain: Chain.ETHEREUM,
        address: '0x1234',
      });

      expect(result.confidence).toBeLessThan(1);
      expect(result.confidence).toBeGreaterThanOrEqual(0.66);
    });
  });

  // ===========================================================================
  // AUDIT LOGGING
  // ===========================================================================

  describe('Audit Logging', () => {
    it('should create audit entries', async () => {
      const transfer = createMockTransfer();

      mockFusionEngine = createMockFusionEngine({
        activeProviders: ['alchemy', 'quicknode', 'infura'],
        transfersByProvider: {
          alchemy: [transfer],
          quicknode: [transfer],
          infura: [transfer],
        },
      });

      engine = new ConsensusEngine(mockFusionEngine, { auditEnabled: true });

      await engine.getTransfersWithConsensus({
        chain: Chain.ETHEREUM,
        address: '0x1234',
      });

      const auditLog = engine.getAuditLog();
      expect(auditLog.length).toBe(1);
      expect(auditLog[0].id).toMatch(/^audit-/);
    });

    it('should limit audit log size', async () => {
      const transfer = createMockTransfer();

      mockFusionEngine = createMockFusionEngine({
        activeProviders: ['alchemy', 'quicknode', 'infura'],
        transfersByProvider: {
          alchemy: [transfer],
          quicknode: [transfer],
          infura: [transfer],
        },
      });

      engine = new ConsensusEngine(mockFusionEngine, { 
        auditEnabled: true,
        maxAuditEntries: 5,
      });

      // Make 10 queries
      for (let i = 0; i < 10; i++) {
        await engine.getTransfersWithConsensus({
          chain: Chain.ETHEREUM,
          address: '0x1234',
        });
      }

      const auditLog = engine.getAuditLog();
      expect(auditLog.length).toBeLessThanOrEqual(5);
    });

    it('should retrieve specific audit entry', async () => {
      const transfer = createMockTransfer();

      mockFusionEngine = createMockFusionEngine({
        activeProviders: ['alchemy', 'quicknode', 'infura'],
        transfersByProvider: {
          alchemy: [transfer],
          quicknode: [transfer],
          infura: [transfer],
        },
      });

      engine = new ConsensusEngine(mockFusionEngine, { auditEnabled: true });

      const result = await engine.getTransfersWithConsensus({
        chain: Chain.ETHEREUM,
        address: '0x1234',
      });

      const entry = engine.getAuditEntry(result.auditId);
      expect(entry).toBeDefined();
      expect(entry?.id).toBe(result.auditId);
    });
  });

  // ===========================================================================
  // STATS
  // ===========================================================================

  describe('Statistics', () => {
    it('should track query stats', async () => {
      const transfer = createMockTransfer();

      mockFusionEngine = createMockFusionEngine({
        activeProviders: ['alchemy', 'quicknode', 'infura'],
        transfersByProvider: {
          alchemy: [transfer],
          quicknode: [transfer],
          infura: [transfer],
        },
      });

      engine = new ConsensusEngine(mockFusionEngine);

      await engine.getTransfersWithConsensus({
        chain: Chain.ETHEREUM,
        address: '0x1234',
      });

      const stats = engine.getStats();
      expect(stats.totalQueries).toBe(1);
      expect(stats.consensusReached).toBe(1);
    });

    it('should track provider reliability', async () => {
      const transfer1 = createMockTransfer({ hash: '0xabc123' });
      const transfer2 = createMockTransfer({ hash: '0xdef456' });

      mockFusionEngine = createMockFusionEngine({
        activeProviders: ['alchemy', 'quicknode', 'infura'],
        transfersByProvider: {
          alchemy: [transfer1],
          quicknode: [transfer1],
          infura: [transfer2], // Disagrees
        },
      });

      engine = new ConsensusEngine(mockFusionEngine);

      await engine.getTransfersWithConsensus({
        chain: Chain.ETHEREUM,
        address: '0x1234',
      });

      const stats = engine.getStats();
      expect(stats.providerReliability.alchemy).toBeGreaterThan(stats.providerReliability.infura);
    });

    it('should reset stats', async () => {
      const transfer = createMockTransfer();

      mockFusionEngine = createMockFusionEngine({
        activeProviders: ['alchemy', 'quicknode', 'infura'],
        transfersByProvider: {
          alchemy: [transfer],
          quicknode: [transfer],
          infura: [transfer],
        },
      });

      engine = new ConsensusEngine(mockFusionEngine);

      await engine.getTransfersWithConsensus({
        chain: Chain.ETHEREUM,
        address: '0x1234',
      });

      engine.resetStats();
      const stats = engine.getStats();
      expect(stats.totalQueries).toBe(0);
    });
  });

  // ===========================================================================
  // EVENTS
  // ===========================================================================

  describe('Events', () => {
    it('should emit consensus_completed event', async () => {
      const transfer = createMockTransfer();

      mockFusionEngine = createMockFusionEngine({
        activeProviders: ['alchemy', 'quicknode', 'infura'],
        transfersByProvider: {
          alchemy: [transfer],
          quicknode: [transfer],
          infura: [transfer],
        },
      });

      engine = new ConsensusEngine(mockFusionEngine);

      const eventPromise = new Promise<ConsensusResult>(resolve => {
        engine.on('consensus_completed', resolve);
      });

      await engine.getTransfersWithConsensus({
        chain: Chain.ETHEREUM,
        address: '0x1234',
      });

      const event = await eventPromise;
      expect(event.consensusReached).toBe(true);
    });

    it('should emit consensus_failed event', async () => {
      const transfer1 = createMockTransfer({ hash: '0xabc' });
      const transfer2 = createMockTransfer({ hash: '0xdef' });
      const transfer3 = createMockTransfer({ hash: '0xghi' });

      mockFusionEngine = createMockFusionEngine({
        activeProviders: ['alchemy', 'quicknode', 'infura'],
        transfersByProvider: {
          alchemy: [transfer1],
          quicknode: [transfer2],
          infura: [transfer3],
        },
      });

      engine = new ConsensusEngine(mockFusionEngine);

      const eventPromise = new Promise<ConsensusResult>(resolve => {
        engine.on('consensus_failed', resolve);
      });

      await engine.getTransfersWithConsensus({
        chain: Chain.ETHEREUM,
        address: '0x1234',
      });

      const event = await eventPromise;
      expect(event.consensusReached).toBe(false);
    });
  });
});

