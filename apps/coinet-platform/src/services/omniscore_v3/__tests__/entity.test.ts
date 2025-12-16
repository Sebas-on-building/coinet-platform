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
      
      expect(entity).not.toBeNull();
      expect(entity!.identity.symbol).toBe('BTC');
      expect(entity!.identity.name).toBe('Bitcoin');
      expect(entity!.canonicalId).toBe('bitcoin');
    });
    
    it('should resolve "btc" alias to Bitcoin', () => {
      const entity = resolveWellKnown('btc');
      
      expect(entity).not.toBeNull();
      expect(entity!.identity.symbol).toBe('BTC');
    });
    
    it('should have 100% identity confidence', () => {
      const entity = resolveWellKnown('bitcoin');
      
      expect(entity!.verification.confidence).toBe(100);
      expect(entity!.canScore).toBe(true);
      expect(entity!.legitimacyFromIdentity).toBe('LEGIT');
    });
    
    it('should have correct provider IDs', () => {
      const entity = resolveWellKnown('bitcoin');
      
      expect(entity!.providerIds.coingecko).toBe('bitcoin');
      expect(entity!.providerIds.github).toBe('bitcoin/bitcoin');
      expect(entity!.providerIds.twitter).toBe('bitcoin');
    });
    
    it('should have null contract (native asset)', () => {
      const entity = resolveWellKnown('bitcoin');
      
      expect(entity!.identity.contract).toBeNull();
      expect(entity!.contracts.primary.address).toBeNull();
    });
  });
  
  describe('Ethereum', () => {
    it('should resolve "ethereum" to ETH', () => {
      const entity = resolveWellKnown('ethereum');
      
      expect(entity).not.toBeNull();
      expect(entity!.identity.symbol).toBe('ETH');
      expect(entity!.identity.name).toBe('Ethereum');
    });
    
    it('should resolve "eth" alias', () => {
      const entity = resolveWellKnown('eth');
      
      expect(entity).not.toBeNull();
      expect(entity!.identity.symbol).toBe('ETH');
    });
    
    it('should have DefiLlama ID for TVL data', () => {
      const entity = resolveWellKnown('ethereum');
      
      expect(entity!.providerIds.defillama).toBe('ethereum');
    });
  });
  
  describe('Solana', () => {
    it('should resolve "solana" to SOL', () => {
      const entity = resolveWellKnown('solana');
      
      expect(entity).not.toBeNull();
      expect(entity!.identity.symbol).toBe('SOL');
      expect(entity!.identity.chain).toBe('solana');
    });
    
    it('should resolve "sol" alias', () => {
      const entity = resolveWellKnown('sol');
      
      expect(entity).not.toBeNull();
      expect(entity!.identity.symbol).toBe('SOL');
    });
  });
  
  describe('Unknown entities', () => {
    it('should return null for unknown symbols', () => {
      const entity = resolveWellKnown('unknowncoin123');
      
      expect(entity).toBeNull();
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
  it('should resolve well-known entities via service', async () => {
    const result = await resolveEntity({ query: 'bitcoin' });
    
    expect(result.success).toBe(true);
    expect(result.entity).not.toBeNull();
    expect(result.entity!.identity.symbol).toBe('BTC');
    expect(result.meta.resolvedFrom).toBe('well-known');
  });
  
  it('should include timing metadata', async () => {
    const result = await resolveEntity({ query: 'ethereum' });
    
    expect(result.meta.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.meta.resolvedAt).toBeDefined();
  });
  
  it('should fail gracefully for unknown entities', async () => {
    const result = await resolveEntity({ query: 'unknowncoin123456' });
    
    expect(result.success).toBe(false);
    expect(result.entity).toBeNull();
    expect(result.error).toBeDefined();
  });
  
  it('should handle query type hints', async () => {
    const result = await resolveEntity({
      query: 'btc',
      queryType: 'symbol',
    });
    
    expect(result.success).toBe(true);
    expect(result.entity!.identity.symbol).toBe('BTC');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SCOREABILITY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('canEntityBeScored', () => {
  it('should allow scoring for well-known entities', () => {
    const entity = resolveWellKnown('bitcoin')!;
    const result = canEntityBeScored(entity);
    
    expect(result.canScore).toBe(true);
    expect(result.reason).toBeNull();
  });
  
  it('should require minimum identity confidence', () => {
    const entity = resolveWellKnown('bitcoin')!;
    
    // Simulate low confidence
    entity.verification.confidence = IDENTITY_CONFIDENCE_THRESHOLD - 1;
    
    const result = canEntityBeScored(entity);
    
    expect(result.canScore).toBe(false);
    expect(result.reason).toContain('confidence');
  });
  
  it('should reject entities with too many warnings', () => {
    const entity = resolveWellKnown('bitcoin')!;
    
    // Simulate many warnings
    entity.verification.warnings = [
      'Warning 1',
      'Warning 2',
      'Warning 3',
      'Warning 4',
    ];
    
    const result = canEntityBeScored(entity);
    
    expect(result.canScore).toBe(false);
    expect(result.reason).toContain('warnings');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDER ID TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Provider IDs', () => {
  describe('hasMinimumProviderIds', () => {
    it('should require CoinGecko ID', () => {
      const entity = resolveWellKnown('bitcoin')!;
      
      expect(hasMinimumProviderIds(entity)).toBe(true);
    });
    
    it('should fail without CoinGecko ID', () => {
      const entity = resolveWellKnown('bitcoin')!;
      entity.providerIds.coingecko = null;
      
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
    
    it('should return null for missing providers', () => {
      const entity = resolveWellKnown('bitcoin')!;
      
      // Bitcoin doesn't have DefiLlama (not DeFi)
      expect(getProviderId(entity, 'defillama')).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// IDENTITY VERIFICATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Identity Verification', () => {
  it('should have all verification sources for well-known entities', () => {
    const entity = resolveWellKnown('bitcoin')!;
    const sources = entity.verification.sources;
    
    expect(sources.coingeckoListed).toBe(true);
    expect(sources.contractVerified).toBe(true);
    expect(sources.githubMatched).toBe(true);
    expect(sources.socialsVerified).toBe(true);
    expect(sources.crossReferenced).toBe(true);
  });
  
  it('should have timestamp for verification', () => {
    const entity = resolveWellKnown('ethereum')!;
    
    expect(entity.verification.verifiedAt).toBeDefined();
    expect(new Date(entity.verification.verifiedAt).getTime()).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LEGITIMACY FROM IDENTITY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Legitimacy from Identity', () => {
  it('should return LEGIT for high-confidence entities', () => {
    const entity = resolveWellKnown('bitcoin')!;
    
    expect(entity.legitimacyFromIdentity).toBe('LEGIT');
  });
  
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
      
      // Provider IDs
      expect(entity.providerIds, `${key} missing providerIds`).toBeDefined();
      expect(entity.providerIds.coingecko, `${key} missing coingecko ID`).not.toBeUndefined();
      
      // URLs
      expect(entity.urls, `${key} missing urls`).toBeDefined();
      expect(entity.urls.website, `${key} missing website`).toBeDefined();
      
      // Classification
      expect(entity.sector, `${key} missing sector`).toBeDefined();
    }
  });
  
  it('should have consistent canonical IDs', () => {
    for (const [key, entity] of Object.entries(WELL_KNOWN_ENTITIES)) {
      expect(entity.canonicalId, `${key} canonicalId mismatch`).toBe(key);
      expect(entity.identity.id, `${key} identity.id mismatch`).toBe(key);
    }
  });
});
