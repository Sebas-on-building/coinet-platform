/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🧪 ENTITY RESOLUTION TESTS                                                ║
 * ║                                                                               ║
 * ║   Tests for the entity resolution service.                                   ║
 * ║   "50% of weird scores come from wrong mapping" - this prevents that.        ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { describe, it, expect } from 'vitest';
import {
  resolveEntity,
  resolveWellKnown,
  canEntityBeScored,
  hasMinimumProviderIds,
  getProviderId,
  WELL_KNOWN_ENTITIES,
  IDENTITY_CONFIDENCE_THRESHOLD,
  type EntityResolutionInput,
} from '../data/entity';

// ═══════════════════════════════════════════════════════════════════════════════
// WELL-KNOWN ENTITY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Well-Known Entities', () => {
  describe('Bitcoin', () => {
    it('should resolve "bitcoin" to BTC', () => {
      const entity = resolveWellKnown('bitcoin');
      
      expect(entity).toBeDefined();
      expect(entity!.identity.symbol).toBe('BTC');
      expect(entity!.identity.name).toBe('Bitcoin');
      expect(entity!.canonicalId).toBe('bitcoin');
    });
    
    it('should have 100% identity confidence', () => {
      const entity = resolveWellKnown('bitcoin');
      
      expect(entity!.confidence).toBe(100);
      expect(canEntityBeScored(entity!)).toBe(true);
    });
    
    it('should have correct provider IDs', () => {
      const entity = resolveWellKnown('bitcoin');
      
      expect(getProviderId(entity!, 'coingecko')).toBe('bitcoin');
      expect(getProviderId(entity!, 'github')).toBe('bitcoin/bitcoin');
      expect(getProviderId(entity!, 'twitter')).toBe('bitcoin');
    });
    
    it('should have null contract (native asset)', () => {
      const entity = resolveWellKnown('bitcoin');
      
      expect(entity!.identity.contract).toBeNull();
    });
  });
  
  describe('Ethereum', () => {
    it('should resolve "ethereum" to ETH', () => {
      const entity = resolveWellKnown('ethereum');
      
      expect(entity).toBeDefined();
      expect(entity!.identity.symbol).toBe('ETH');
      expect(entity!.identity.name).toBe('Ethereum');
    });
    
    it('should have DefiLlama ID for TVL data', () => {
      const entity = resolveWellKnown('ethereum');
      
      expect(getProviderId(entity!, 'defillama')).toBe('ethereum');
    });
  });
  
  describe('Solana', () => {
    it('should resolve "solana" to SOL', () => {
      const entity = resolveWellKnown('solana');
      
      expect(entity).toBeDefined();
      expect(entity!.identity.symbol).toBe('SOL');
      expect(entity!.identity.chain).toBe('solana');
    });
  });
  
  describe('Unknown entities', () => {
    it('should return undefined for unknown symbols', () => {
      const entity = resolveWellKnown('unknowncoin123');
      
      expect(entity).toBeUndefined();
    });
    
    it('should be case insensitive', () => {
      const upper = resolveWellKnown('BITCOIN');
      const lower = resolveWellKnown('bitcoin');
      const mixed = resolveWellKnown('BiTcOiN');
      
      expect(upper?.canonicalId).toBe(lower?.canonicalId);
      expect(lower?.canonicalId).toBe(mixed?.canonicalId);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ENTITY RESOLUTION SERVICE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('resolveEntity', () => {
  it('should resolve well-known entities', () => {
    const result = resolveEntity({ id: 'bitcoin' });
    
    expect(result.identity.symbol).toBe('BTC');
    expect(result.method).toBe('exact');
  });
  
  it('should return inferred entity for unknown IDs', () => {
    const result = resolveEntity({ id: 'unknowncoin123456' });
    
    expect(result.method).toBe('inferred');
    expect(result.warnings).toContain('Entity not found in well-known database');
  });
  
  it('should use symbol hint when provided', () => {
    const result = resolveEntity({ id: 'some-token', symbol: 'TEST' });
    
    expect(result.identity.symbol).toBe('TEST');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCOREABILITY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('canEntityBeScored', () => {
  it('should allow scoring for well-known entities', () => {
    const entity = resolveWellKnown('bitcoin')!;
    const result = canEntityBeScored(entity);
    
    expect(result).toBe(true);
  });
  
  it('should require minimum identity confidence', () => {
    const entity = { ...resolveWellKnown('bitcoin')!, confidence: IDENTITY_CONFIDENCE_THRESHOLD - 1 };
    const result = canEntityBeScored(entity);
    
    expect(result).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER ID TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Provider IDs', () => {
  describe('hasMinimumProviderIds', () => {
    it('should require at least one provider ID', () => {
      const entity = resolveWellKnown('bitcoin')!;
      
      expect(hasMinimumProviderIds(entity)).toBe(true);
    });
    
    it('should fail without any provider IDs', () => {
      const entity = {
        ...resolveWellKnown('bitcoin')!,
        identity: { ...resolveWellKnown('bitcoin')!.identity, canonicalProviderIds: {} },
      };
      
      expect(hasMinimumProviderIds(entity)).toBe(false);
    });
  });
  
  describe('getProviderId', () => {
    it('should return correct provider ID', () => {
      const entity = resolveWellKnown('ethereum')!;
      
      expect(getProviderId(entity, 'coingecko')).toBe('ethereum');
      expect(getProviderId(entity, 'defillama')).toBe('ethereum');
      expect(getProviderId(entity, 'github')).toBe('ethereum/go-ethereum');
    });
    
    it('should return undefined for missing providers', () => {
      const entity = resolveWellKnown('bitcoin')!;
      
      expect(getProviderId(entity, 'nonexistent')).toBeUndefined();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECTOR AND CLASSIFICATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Entity Classification', () => {
  it('should properly classify sector', () => {
    const btc = resolveWellKnown('bitcoin')!;
    const eth = resolveWellKnown('ethereum')!;
    const sol = resolveWellKnown('solana')!;
    
    expect(btc.sector).toBe('L1');
    expect(eth.sector).toBe('L1');
    expect(sol.sector).toBe('L1');
  });
  
  it('should properly classify cap bucket', () => {
    const btc = resolveWellKnown('bitcoin')!;
    const eth = resolveWellKnown('ethereum')!;
    
    expect(btc.capBucket).toBe('mega');
    expect(eth.capBucket).toBe('mega');
  });
  
  it('should have high confidence for well-known entities', () => {
    const btc = resolveWellKnown('bitcoin')!;
    
    expect(btc.confidence).toBe(100);
    expect(canEntityBeScored(btc)).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WELL-KNOWN ENTITIES DATA INTEGRITY
// ═══════════════════════════════════════════════════════════════════════════════

describe('Well-Known Entities Data Integrity', () => {
  it('should have all required fields', () => {
    for (const [key, entity] of Object.entries(WELL_KNOWN_ENTITIES)) {
      // Identity
      expect(entity.identity.id, `${key} missing identity.id`).toBeDefined();
      expect(entity.identity.symbol, `${key} missing identity.symbol`).toBeDefined();
      expect(entity.identity.name, `${key} missing identity.name`).toBeDefined();
      expect(entity.identity.chain, `${key} missing identity.chain`).toBeDefined();
      
      // Provider IDs (in canonicalProviderIds)
      expect(entity.identity.canonicalProviderIds, `${key} missing canonicalProviderIds`).toBeDefined();
      expect(entity.identity.canonicalProviderIds?.coingecko, `${key} missing coingecko ID`).toBeDefined();
      
      // Classification
      expect(entity.sector, `${key} missing sector`).toBeDefined();
      expect(entity.capBucket, `${key} missing capBucket`).toBeDefined();
    }
  });
  
  it('should have consistent canonical IDs', () => {
    for (const [key, entity] of Object.entries(WELL_KNOWN_ENTITIES)) {
      expect(entity.canonicalId, `${key} canonicalId mismatch`).toBe(key);
      expect(entity.identity.id, `${key} identity.id mismatch`).toBe(key);
    }
  });
});
