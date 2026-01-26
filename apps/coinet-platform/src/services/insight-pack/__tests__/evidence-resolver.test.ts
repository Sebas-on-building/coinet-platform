/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🧪 INSIGHT PACK — EVIDENCE RESOLVER TESTS                                 ║
 * ║                                                                               ║
 * ║   Tests for evidence key path resolution.                                     ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Pass-1 Insight Pack Layer                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import {
  resolveEvidencePath,
  parseEvidencePath,
  validateEvidenceKeys,
  getAvailableModules,
  isModuleAvailable,
  suggestPathsForModule,
} from '../evidence-resolver';
import { MOCK_EVIDENCE_PACK } from './fixtures';

// ============================================================================
// PATH PARSING TESTS
// ============================================================================

describe('parseEvidencePath', () => {
  test('should parse simple path', () => {
    const segments = parseEvidencePath('evidence.dexscreener.data.price');
    expect(segments).toEqual(['dexscreener', 'data', 'price']);
  });

  test('should parse path with array index', () => {
    const segments = parseEvidencePath('evidence.security.data.flags[0].code');
    expect(segments).toEqual(['security', 'data', 'flags', 0, 'code']);
  });

  test('should parse path with multiple array indexes', () => {
    const segments = parseEvidencePath('evidence.module.arr[0].nested[1].value');
    expect(segments).toEqual(['module', 'arr', 0, 'nested', 1, 'value']);
  });

  test('should throw on path not starting with evidence.', () => {
    expect(() => parseEvidencePath('dexscreener.data.price')).toThrow();
    expect(() => parseEvidencePath('invalid.path')).toThrow();
  });

  test('should throw on unclosed bracket', () => {
    expect(() => parseEvidencePath('evidence.module.arr[0.value')).toThrow();
  });

  test('should throw on non-numeric array index', () => {
    expect(() => parseEvidencePath('evidence.module.arr[abc].value')).toThrow();
  });
});

// ============================================================================
// PATH RESOLUTION TESTS
// ============================================================================

describe('resolveEvidencePath', () => {
  test('should resolve valid path to price', () => {
    const result = resolveEvidencePath(MOCK_EVIDENCE_PACK, 'evidence.dexscreener.data.price');
    expect(result.exists).toBe(true);
    expect(result.value).toBe(0.00042);
  });

  test('should resolve nested object path', () => {
    const result = resolveEvidencePath(MOCK_EVIDENCE_PACK, 'evidence.dexscreener.data.txns_24h.buys');
    expect(result.exists).toBe(true);
    expect(result.value).toBe(342);
  });

  test('should resolve array index path', () => {
    const result = resolveEvidencePath(MOCK_EVIDENCE_PACK, 'evidence.security.data.flags[0].code');
    expect(result.exists).toBe(true);
    expect(result.value).toBe('MINTABLE');
  });

  test('should return exists=false for missing module', () => {
    const result = resolveEvidencePath(MOCK_EVIDENCE_PACK, 'evidence.holders.data.total');
    expect(result.exists).toBe(false);
    expect(result.error).toContain('not found');
  });

  test('should return exists=false for invalid path segment', () => {
    const result = resolveEvidencePath(MOCK_EVIDENCE_PACK, 'evidence.dexscreener.data.nonexistent');
    expect(result.exists).toBe(false);
  });

  test('should return exists=false for out-of-bounds array index', () => {
    const result = resolveEvidencePath(MOCK_EVIDENCE_PACK, 'evidence.security.data.flags[99].code');
    expect(result.exists).toBe(false);
    expect(result.error).toContain('out of bounds');
  });

  test('should handle null module data', () => {
    const result = resolveEvidencePath(MOCK_EVIDENCE_PACK, 'evidence.pumpfun.data.field');
    expect(result.exists).toBe(false);
  });
});

// ============================================================================
// BATCH VALIDATION TESTS
// ============================================================================

describe('validateEvidenceKeys', () => {
  test('should validate all valid keys', () => {
    const keys = [
      'evidence.dexscreener.data.price',
      'evidence.dexscreener.data.volume_24h',
      'evidence.security.data.risk_level',
    ];
    const result = validateEvidenceKeys(MOCK_EVIDENCE_PACK, keys);
    expect(result.valid).toBe(true);
    expect(result.validKeys).toHaveLength(3);
    expect(result.invalidKeys).toHaveLength(0);
  });

  test('should identify invalid keys', () => {
    const keys = [
      'evidence.dexscreener.data.price',  // Valid
      'evidence.fake_module.data.field',   // Invalid module
      'evidence.dexscreener.nonexistent',  // Invalid field
    ];
    const result = validateEvidenceKeys(MOCK_EVIDENCE_PACK, keys);
    expect(result.valid).toBe(false);
    expect(result.validKeys).toHaveLength(1);
    expect(result.invalidKeys).toHaveLength(2);
  });

  test('should return empty arrays for empty input', () => {
    const result = validateEvidenceKeys(MOCK_EVIDENCE_PACK, []);
    expect(result.valid).toBe(true);
    expect(result.validKeys).toHaveLength(0);
    expect(result.invalidKeys).toHaveLength(0);
  });
});

// ============================================================================
// MODULE AVAILABILITY TESTS
// ============================================================================

describe('getAvailableModules', () => {
  test('should return available modules from TOKEN pack', () => {
    const modules = getAvailableModules(MOCK_EVIDENCE_PACK);
    expect(modules).toContain('dexscreener');
    expect(modules).toContain('security');
    expect(modules).not.toContain('holders');
    expect(modules).not.toContain('pumpfun');
  });
});

describe('isModuleAvailable', () => {
  test('should return true for available module', () => {
    expect(isModuleAvailable(MOCK_EVIDENCE_PACK, 'evidence.dexscreener.data.price')).toBe(true);
    expect(isModuleAvailable(MOCK_EVIDENCE_PACK, 'evidence.security.data.risk_level')).toBe(true);
  });

  test('should return false for unavailable module', () => {
    expect(isModuleAvailable(MOCK_EVIDENCE_PACK, 'evidence.holders.data.total')).toBe(false);
    expect(isModuleAvailable(MOCK_EVIDENCE_PACK, 'evidence.pumpfun.data.field')).toBe(false);
  });

  test('should return false for invalid path', () => {
    expect(isModuleAvailable(MOCK_EVIDENCE_PACK, 'invalid.path')).toBe(false);
    expect(isModuleAvailable(MOCK_EVIDENCE_PACK, '')).toBe(false);
  });
});

// ============================================================================
// PATH SUGGESTION TESTS
// ============================================================================

describe('suggestPathsForModule', () => {
  test('should suggest valid paths for dexscreener module', () => {
    const suggestions = suggestPathsForModule(MOCK_EVIDENCE_PACK, 'dexscreener');
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some(s => s.includes('price'))).toBe(true);
    expect(suggestions.some(s => s.includes('volume_24h'))).toBe(true);
  });

  test('should return empty array for missing module', () => {
    const suggestions = suggestPathsForModule(MOCK_EVIDENCE_PACK, 'holders');
    expect(suggestions).toHaveLength(0);
  });

  test('should limit depth of traversal', () => {
    const suggestions = suggestPathsForModule(MOCK_EVIDENCE_PACK, 'dexscreener');
    // All paths should be reasonable depth
    for (const path of suggestions) {
      const depth = path.split('.').length;
      expect(depth).toBeLessThanOrEqual(10);
    }
  });
});
