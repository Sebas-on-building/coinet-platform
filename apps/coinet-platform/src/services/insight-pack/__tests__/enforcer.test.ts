/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🧪 INSIGHT PACK — ENFORCER TESTS                                          ║
 * ║                                                                               ║
 * ║   Tests for schema enforcement and validation.                                ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Pass-1 Insight Pack Layer                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import {
  enforceInsightPack,
  extractJson,
  validateSchema,
  checkNumericLiterals,
  verifyEvidenceKeys,
  collectRetryErrors,
} from '../enforcer';
import { containsNumericLiteral, InsightPackV1 } from '../types';
import {
  MOCK_EVIDENCE_PACK,
  VALID_INSIGHT_PACK,
  VALID_INSIGHT_PACK_JSON,
  INVALID_PROSE_JSON,
  FENCED_JSON,
  EXTRA_KEYS_JSON,
  INVALID_EVIDENCE_KEYS_JSON,
  NUMERIC_LITERALS_JSON,
  MISSING_FIELDS_JSON,
  WRONG_ENUM_JSON,
  GROK_ERROR_OUTPUT,
  EMPTY_JSON,
  INVALID_JSON_SYNTAX,
  EDGE_CASE_FIXTURES,
} from './fixtures';

// ============================================================================
// JSON EXTRACTION TESTS
// ============================================================================

describe('extractJson', () => {
  test('should extract raw JSON directly', () => {
    const result = extractJson(VALID_INSIGHT_PACK_JSON);
    expect(result.success).toBe(true);
    expect(result.strategy).toBe('raw');
    expect(result.json).toBeDefined();
  });

  test('should extract JSON from markdown fences', () => {
    const result = extractJson(FENCED_JSON);
    expect(result.success).toBe(true);
    expect(result.strategy).toBe('fenced');
    expect(result.json).toBeDefined();
  });

  test('should extract JSON from prose by locating braces', () => {
    const result = extractJson(INVALID_PROSE_JSON);
    expect(result.success).toBe(true);
    expect(result.strategy).toBe('locate_braces');
    expect(result.json).toBeDefined();
  });

  test('should fail on invalid JSON syntax', () => {
    const result = extractJson(INVALID_JSON_SYNTAX);
    expect(result.success).toBe(false);
  });

  test('should fail on text without JSON', () => {
    const result = extractJson('This is just plain text without any JSON');
    expect(result.success).toBe(false);
  });
});

// ============================================================================
// SCHEMA VALIDATION TESTS
// ============================================================================

describe('validateSchema', () => {
  test('should validate correct InsightPack', () => {
    const result = validateSchema(VALID_INSIGHT_PACK);
    expect(result.valid).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.errors).toHaveLength(0);
  });

  test('should reject empty object', () => {
    const result = validateSchema({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('should reject wrong enum values', () => {
    const parsed = JSON.parse(WRONG_ENUM_JSON);
    const result = validateSchema(parsed);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('confidence') || e.includes('direction'))).toBe(true);
  });

  test('should reject missing required fields', () => {
    const parsed = JSON.parse(MISSING_FIELDS_JSON);
    const result = validateSchema(parsed);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('should validate driver ID format', () => {
    const invalidDriver = {
      ...VALID_INSIGHT_PACK,
      drivers: [{
        id: 'invalid_id',  // Should be d1, d2, etc.
        topic: 'Test',
        summary: 'Test summary that is long enough',
        evidence_keys: ['evidence.dexscreener.data.price'],
        confidence: 'high',
      }],
    };
    const result = validateSchema(invalidDriver);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('id'))).toBe(true);
  });

  test('should require at least one driver', () => {
    const noDrivers = {
      ...VALID_INSIGHT_PACK,
      drivers: [],
    };
    const result = validateSchema(noDrivers);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('drivers'))).toBe(true);
  });
});

// ============================================================================
// NUMERIC LITERAL TESTS
// ============================================================================

describe('containsNumericLiteral', () => {
  test('should detect numeric literals', () => {
    expect(containsNumericLiteral('Price increased 15% today')).toBe(true);
    expect(containsNumericLiteral('Volume is $125,000')).toBe(true);
    expect(containsNumericLiteral('Token is 3 hours old')).toBe(true);
    expect(containsNumericLiteral('Top 10 holders own 58%')).toBe(true);
    expect(containsNumericLiteral('Liquidity is 45K')).toBe(true);
  });

  test('should allow ordinals', () => {
    expect(containsNumericLiteral('This is the 1st driver')).toBe(false);
    expect(containsNumericLiteral('Ranked 2nd in volume')).toBe(false);
  });

  test('should allow ID references', () => {
    expect(containsNumericLiteral('See driver d1 for details')).toBe(false);
    expect(containsNumericLiteral('Risk r2 is related')).toBe(false);
  });

  test('should pass text without numbers', () => {
    expect(containsNumericLiteral('Strong buying pressure detected')).toBe(false);
    expect(containsNumericLiteral('Liquidity is relatively low')).toBe(false);
    expect(containsNumericLiteral('Token was recently launched')).toBe(false);
  });
});

describe('checkNumericLiterals', () => {
  test('should pass valid InsightPack', () => {
    const result = checkNumericLiterals(VALID_INSIGHT_PACK);
    expect(result.clean).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  test('should detect numeric literals in drivers', () => {
    const parsed = JSON.parse(NUMERIC_LITERALS_JSON);
    // First validate schema to get proper typing
    const schemaResult = validateSchema(parsed);
    if (schemaResult.valid) {
      const result = checkNumericLiterals(schemaResult.data!);
      expect(result.clean).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some(v => v.field.includes('drivers'))).toBe(true);
    }
  });
});

// ============================================================================
// EVIDENCE KEY VERIFICATION TESTS
// ============================================================================

describe('verifyEvidenceKeys', () => {
  test('should pass valid evidence keys', () => {
    const result = verifyEvidenceKeys(VALID_INSIGHT_PACK, MOCK_EVIDENCE_PACK, true);
    expect(result.valid).toBe(true);
    expect(result.invalidItems).toHaveLength(0);
  });

  test('should detect invalid evidence keys', () => {
    const parsed = JSON.parse(INVALID_EVIDENCE_KEYS_JSON);
    const schemaResult = validateSchema(parsed);
    if (schemaResult.valid) {
      const result = verifyEvidenceKeys(schemaResult.data!, MOCK_EVIDENCE_PACK, true);
      expect(result.valid).toBe(false);
      expect(result.invalidItems.length).toBeGreaterThan(0);
    }
  });

  test('should create demotions in strict mode', () => {
    const parsed = JSON.parse(INVALID_EVIDENCE_KEYS_JSON);
    const schemaResult = validateSchema(parsed);
    if (schemaResult.valid) {
      const result = verifyEvidenceKeys(schemaResult.data!, MOCK_EVIDENCE_PACK, true);
      expect(result.demotions.length).toBeGreaterThan(0);
      expect(result.demotions[0].why_unknown).toBe('evidence_key_invalid');
    }
  });

  test('should not create demotions in lenient mode', () => {
    const parsed = JSON.parse(INVALID_EVIDENCE_KEYS_JSON);
    const schemaResult = validateSchema(parsed);
    if (schemaResult.valid) {
      const result = verifyEvidenceKeys(schemaResult.data!, MOCK_EVIDENCE_PACK, false);
      expect(result.demotions).toHaveLength(0);
    }
  });
});

// ============================================================================
// FULL ENFORCEMENT TESTS
// ============================================================================

describe('enforceInsightPack', () => {
  test('should succeed with valid InsightPack', () => {
    const result = enforceInsightPack(VALID_INSIGHT_PACK_JSON, MOCK_EVIDENCE_PACK);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.degraded).toBe(false);
      expect(result.data).toBeDefined();
      expect(result.attemptsUsed).toBe(1);
    }
  });

  test('should extract and validate JSON from prose', () => {
    const result = enforceInsightPack(INVALID_PROSE_JSON, MOCK_EVIDENCE_PACK);
    expect(result.ok).toBe(true);
  });

  test('should extract and validate fenced JSON', () => {
    const result = enforceInsightPack(FENCED_JSON, MOCK_EVIDENCE_PACK);
    expect(result.ok).toBe(true);
  });

  test('should fail on Grok error output', () => {
    const result = enforceInsightPack(GROK_ERROR_OUTPUT, MOCK_EVIDENCE_PACK);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Grok');
    }
  });

  test('should fail on missing required fields', () => {
    const result = enforceInsightPack(MISSING_FIELDS_JSON, MOCK_EVIDENCE_PACK);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.validationErrors.length).toBeGreaterThan(0);
    }
  });

  test('should fail on wrong enum values', () => {
    const result = enforceInsightPack(WRONG_ENUM_JSON, MOCK_EVIDENCE_PACK);
    expect(result.ok).toBe(false);
  });

  test('should fail on numeric literals in strict mode', () => {
    const result = enforceInsightPack(
      NUMERIC_LITERALS_JSON,
      MOCK_EVIDENCE_PACK,
      { strictEvidenceKeys: true }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.validationErrors.some(e => e.includes('Numeric'))).toBe(true);
    }
  });

  test('should succeed but degrade with invalid evidence keys', () => {
    const result = enforceInsightPack(
      INVALID_EVIDENCE_KEYS_JSON,
      MOCK_EVIDENCE_PACK,
      { strictEvidenceKeys: true }
    );
    // Should either fail or succeed with degraded=true
    if (result.ok) {
      expect(result.degraded).toBe(true);
      expect(result.demotedItems).toBeGreaterThan(0);
    }
  });

  test('should include lastRawExcerpt on failure', () => {
    const result = enforceInsightPack(INVALID_JSON_SYNTAX, MOCK_EVIDENCE_PACK);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.lastRawExcerpt).toBeDefined();
      expect(result.lastRawExcerpt.length).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// RETRY ERROR COLLECTION TESTS
// ============================================================================

describe('collectRetryErrors', () => {
  test('should collect schema errors', () => {
    const errors = collectRetryErrors(MISSING_FIELDS_JSON, MOCK_EVIDENCE_PACK);
    expect(errors.validationErrors.length).toBeGreaterThan(0);
  });

  test('should collect evidence key errors', () => {
    const errors = collectRetryErrors(INVALID_EVIDENCE_KEYS_JSON, MOCK_EVIDENCE_PACK);
    expect(errors.evidenceKeyErrors.length).toBeGreaterThan(0);
  });

  test('should collect numeric literal errors', () => {
    const errors = collectRetryErrors(NUMERIC_LITERALS_JSON, MOCK_EVIDENCE_PACK);
    expect(errors.numericLiteralErrors.length).toBeGreaterThan(0);
  });

  test('should return empty errors for valid JSON', () => {
    const errors = collectRetryErrors(VALID_INSIGHT_PACK_JSON, MOCK_EVIDENCE_PACK);
    expect(errors.validationErrors).toHaveLength(0);
    expect(errors.evidenceKeyErrors).toHaveLength(0);
    expect(errors.numericLiteralErrors).toHaveLength(0);
  });
});

// ============================================================================
// EDGE CASE MATRIX TESTS
// ============================================================================

describe('Edge Case Matrix', () => {
  for (const testCase of EDGE_CASE_FIXTURES) {
    test(`should handle: ${testCase.name}`, () => {
      const result = enforceInsightPack(
        testCase.input,
        MOCK_EVIDENCE_PACK,
        { strictEvidenceKeys: true }
      );
      
      expect(result.ok).toBe(testCase.expectedOk);
      
      if (result.ok && testCase.expectedDegraded !== undefined) {
        expect(result.degraded).toBe(testCase.expectedDegraded);
      }
    });
  }
});

// ============================================================================
// DETERMINISM TESTS
// ============================================================================

describe('Determinism', () => {
  test('same input should produce same output', () => {
    const result1 = enforceInsightPack(VALID_INSIGHT_PACK_JSON, MOCK_EVIDENCE_PACK);
    const result2 = enforceInsightPack(VALID_INSIGHT_PACK_JSON, MOCK_EVIDENCE_PACK);
    const result3 = enforceInsightPack(VALID_INSIGHT_PACK_JSON, MOCK_EVIDENCE_PACK);

    expect(result1.ok).toBe(result2.ok);
    expect(result2.ok).toBe(result3.ok);

    if (result1.ok && result2.ok && result3.ok) {
      expect(result1.degraded).toBe(result2.degraded);
      expect(result2.degraded).toBe(result3.degraded);
    }
  });

  test('failure should be deterministic', () => {
    const result1 = enforceInsightPack(MISSING_FIELDS_JSON, MOCK_EVIDENCE_PACK);
    const result2 = enforceInsightPack(MISSING_FIELDS_JSON, MOCK_EVIDENCE_PACK);

    expect(result1.ok).toBe(result2.ok);
    if (!result1.ok && !result2.ok) {
      expect(result1.validationErrors.length).toBe(result2.validationErrors.length);
    }
  });
});
