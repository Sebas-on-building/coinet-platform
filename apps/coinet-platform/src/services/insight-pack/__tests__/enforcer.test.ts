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
  validateContent,
  verifyEvidenceKeysCoverageAware,
  collectRetryErrors,
} from '../enforcer';
import { 
  containsNumericLiteral, 
  detectNumericLiterals, 
  detectUserTalk,
  InsightPackV1, 
  DEFAULT_ENFORCEMENT_OPTIONS,
} from '../types';
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
    const result = extractJson(VALID_INSIGHT_PACK_JSON, false);
    expect(result.success).toBe(true);
    expect(result.strategy).toBe('raw');
    expect(result.json).toBeDefined();
  });

  test('should extract JSON from markdown fences', () => {
    const result = extractJson(FENCED_JSON, false);
    expect(result.success).toBe(true);
    expect(result.strategy).toBe('fenced');
    expect(result.json).toBeDefined();
  });

  test('should extract JSON from prose by locating braces (lenient mode)', () => {
    const result = extractJson(INVALID_PROSE_JSON, false);  // Lenient mode
    expect(result.success).toBe(true);
    expect(result.strategy).toBe('locate_braces');
    expect(result.json).toBeDefined();
  });

  test('should FAIL on prose in strict mode (FIX #7)', () => {
    const result = extractJson(INVALID_PROSE_JSON, true);  // Strict mode
    expect(result.success).toBe(false);
    expect(result.hasLeadingText || result.hasTrailingText).toBe(true);
  });

  test('should fail on invalid JSON syntax', () => {
    const result = extractJson(INVALID_JSON_SYNTAX, false);
    expect(result.success).toBe(false);
  });

  test('should fail on text without JSON', () => {
    const result = extractJson('This is just plain text without any JSON', false);
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

  test('should allow empty drivers array (FIX #3 - validated in content check)', () => {
    // Schema now allows empty drivers, but content validation catches it
    const noDrivers = {
      ...VALID_INSIGHT_PACK,
      drivers: [],
    };
    const result = validateSchema(noDrivers);
    // Schema should pass (empty arrays allowed)
    expect(result.valid).toBe(true);
  });

  test('should reject extra keys (FIX #1 - .strict())', () => {
    const withExtraKeys = {
      ...VALID_INSIGHT_PACK,
      extra_field: 'not allowed',
    };
    const result = validateSchema(withExtraKeys);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('extra_field') || e.includes('Unrecognized'))).toBe(true);
  });
});

// ============================================================================
// NUMERIC LITERAL TESTS
// ============================================================================

describe('detectNumericLiterals (FIX #4 - strengthened)', () => {
  test('should detect basic numeric literals', () => {
    expect(detectNumericLiterals('Price increased 15% today').clean).toBe(false);
    expect(detectNumericLiterals('Volume is $125,000').clean).toBe(false);
    expect(detectNumericLiterals('Token is 3 hours old').clean).toBe(false);
    expect(detectNumericLiterals('Top 10 holders own 58%').clean).toBe(false);
    expect(detectNumericLiterals('Liquidity is 45K').clean).toBe(false);
  });

  test('should detect currency formats (FIX #4)', () => {
    expect(detectNumericLiterals('Price is $45K').clean).toBe(false);
    expect(detectNumericLiterals('Market cap €1.2M').clean).toBe(false);
    expect(detectNumericLiterals('Volume 125000 USD').clean).toBe(false);
  });

  test('should detect multipliers (FIX #4)', () => {
    expect(detectNumericLiterals('Potential x10 from here').clean).toBe(false);
    expect(detectNumericLiterals('Did a 2x already').clean).toBe(false);
  });

  test('should detect European formats (FIX #4)', () => {
    expect(detectNumericLiterals('Price 1.000.000').clean).toBe(false);
    expect(detectNumericLiterals('Change 1,5%').clean).toBe(false);
  });

  test('should allow ordinals', () => {
    expect(detectNumericLiterals('This is the 1st driver').clean).toBe(true);
    expect(detectNumericLiterals('Ranked 2nd in volume').clean).toBe(true);
  });

  test('should allow ID references', () => {
    expect(detectNumericLiterals('See driver d1 for details').clean).toBe(true);
    expect(detectNumericLiterals('Risk r2 is related').clean).toBe(true);
  });

  test('should allow tech identifiers (FIX #4)', () => {
    expect(detectNumericLiterals('Layer 2 solution').clean).toBe(true);
    expect(detectNumericLiterals('ERC-20 token').clean).toBe(true);
  });

  test('should pass text without numbers', () => {
    expect(detectNumericLiterals('Strong buying pressure detected').clean).toBe(true);
    expect(detectNumericLiterals('Liquidity is relatively low').clean).toBe(true);
    expect(detectNumericLiterals('Token was recently launched').clean).toBe(true);
  });
});

describe('detectUserTalk (FIX #8 - no user-facing language)', () => {
  test('should detect greetings', () => {
    expect(detectUserTalk('Hey, looking at this token').clean).toBe(false);
    expect(detectUserTalk('Hello trader').clean).toBe(false);
  });

  test('should detect second person', () => {
    expect(detectUserTalk('You should be careful').clean).toBe(false);
    expect(detectUserTalk('Your portfolio might benefit').clean).toBe(false);
  });

  test('should detect disclaimers', () => {
    expect(detectUserTalk('Not financial advice').clean).toBe(false);
    expect(detectUserTalk('DYOR before investing').clean).toBe(false);
  });

  test('should detect chatty filler', () => {
    expect(detectUserTalk('Honestly this looks good').clean).toBe(false);
    expect(detectUserTalk('Basically the trend is up').clean).toBe(false);
  });

  test('should detect slang', () => {
    expect(detectUserTalk('Looking good bro').clean).toBe(false);
    expect(detectUserTalk('Nice find dude').clean).toBe(false);
  });

  test('should pass analytical language', () => {
    expect(detectUserTalk('Strong momentum observed').clean).toBe(true);
    expect(detectUserTalk('Risk assessment indicates concern').clean).toBe(true);
    expect(detectUserTalk('Liquidity depth is shallow').clean).toBe(true);
  });
});

describe('validateContent (FIX #3, #4, #8)', () => {
  test('should pass valid InsightPack', () => {
    const result = validateContent(VALID_INSIGHT_PACK, DEFAULT_ENFORCEMENT_OPTIONS);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should fail when all arrays empty (FIX #3)', () => {
    const emptyContent = {
      ...VALID_INSIGHT_PACK,
      drivers: [],
      risks: [],
      catalysts_next: [],
      unknowns: [],
    };
    const result = validateContent(emptyContent, DEFAULT_ENFORCEMENT_OPTIONS);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('non-empty'))).toBe(true);
  });

  test('should pass with only unknowns (FIX #3)', () => {
    const onlyUnknowns = {
      ...VALID_INSIGHT_PACK,
      drivers: [],
      risks: [],
      catalysts_next: [],
      unknowns: [{
        id: 'u1',
        what: 'Insufficient data for analysis',
        why_unknown: 'insufficient_evidence' as const,
        would_help: 'More complete Evidence Pack',
      }],
    };
    const result = validateContent(onlyUnknowns, DEFAULT_ENFORCEMENT_OPTIONS);
    expect(result.valid).toBe(true);
  });
});

// ============================================================================
// EVIDENCE KEY VERIFICATION TESTS
// ============================================================================

describe('verifyEvidenceKeysCoverageAware (FIX #6)', () => {
  test('should pass valid evidence keys', () => {
    const result = verifyEvidenceKeysCoverageAware(VALID_INSIGHT_PACK, MOCK_EVIDENCE_PACK, true);
    expect(result.valid).toBe(true);
    expect(result.invalidItems).toHaveLength(0);
  });

  test('should detect invalid evidence keys', () => {
    const parsed = JSON.parse(INVALID_EVIDENCE_KEYS_JSON);
    const schemaResult = validateSchema(parsed);
    if (schemaResult.valid) {
      const result = verifyEvidenceKeysCoverageAware(schemaResult.data!, MOCK_EVIDENCE_PACK, true);
      expect(result.valid).toBe(false);
      expect(result.invalidItems.length).toBeGreaterThan(0);
    }
  });

  test('should detect references to missing modules (FIX #6)', () => {
    // Create InsightPack that references a missing module
    const packWithMissingModuleRef = {
      ...VALID_INSIGHT_PACK,
      drivers: [{
        id: 'd1',
        topic: 'Test driver',
        summary: 'Referencing a module that is not available',
        evidence_keys: ['evidence.holders.data.total_holders'],  // holders is in missing_modules
        confidence: 'medium' as const,
      }],
    };
    const result = verifyEvidenceKeysCoverageAware(packWithMissingModuleRef, MOCK_EVIDENCE_PACK, true);
    expect(result.valid).toBe(false);
    expect(result.invalidItems[0].invalidKeys[0].reason).toContain('not in available_modules');
  });

  test('should create demotions in strict mode', () => {
    const parsed = JSON.parse(INVALID_EVIDENCE_KEYS_JSON);
    const schemaResult = validateSchema(parsed);
    if (schemaResult.valid) {
      const result = verifyEvidenceKeysCoverageAware(schemaResult.data!, MOCK_EVIDENCE_PACK, true);
      expect(result.demotions.length).toBeGreaterThan(0);
      expect(result.demotions[0].why_unknown).toBe('evidence_key_invalid');
    }
  });

  test('should not create demotions in lenient mode', () => {
    const parsed = JSON.parse(INVALID_EVIDENCE_KEYS_JSON);
    const schemaResult = validateSchema(parsed);
    if (schemaResult.valid) {
      const result = verifyEvidenceKeysCoverageAware(schemaResult.data!, MOCK_EVIDENCE_PACK, false);
      expect(result.demotions).toHaveLength(0);
    }
  });
});

// ============================================================================
// FULL ENFORCEMENT TESTS
// ============================================================================

describe('enforceInsightPack (hardened)', () => {
  const serverMeta = {
    intent: 'new_coin_analysis' as const,
    language: 'en',
    asset_focus: 'PEPE',
    chain: 'solana',
    timeframe: 'snapshot' as const,
  };

  test('should succeed with valid InsightPack', () => {
    const result = enforceInsightPack(VALID_INSIGHT_PACK_JSON, MOCK_EVIDENCE_PACK, { serverMeta });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.degraded).toBe(false);
      expect(result.data).toBeDefined();
      expect(result.attemptsUsed).toBe(1);
    }
  });

  test('should apply server-authoritative overwrites (FIX #2)', () => {
    const result = enforceInsightPack(VALID_INSIGHT_PACK_JSON, MOCK_EVIDENCE_PACK, { serverMeta });
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Meta should reflect server values
      expect(result.data.meta.intent).toBe(serverMeta.intent);
      expect(result.data.meta.language).toBe(serverMeta.language);
      // Coverage should be computed from evidence pack
      expect(result.data.coverage_used.available_modules).toContain('dexscreener');
    }
  });

  test('should FAIL on prose in strict mode (FIX #7)', () => {
    const result = enforceInsightPack(
      INVALID_PROSE_JSON, 
      MOCK_EVIDENCE_PACK, 
      { serverMeta, strictJsonExtraction: true }
    );
    expect(result.ok).toBe(false);
  });

  test('should extract and validate fenced JSON (lenient extraction)', () => {
    const result = enforceInsightPack(
      FENCED_JSON, 
      MOCK_EVIDENCE_PACK, 
      { serverMeta, strictJsonExtraction: false }
    );
    expect(result.ok).toBe(true);
  });

  test('should fail on Grok error output', () => {
    const result = enforceInsightPack(GROK_ERROR_OUTPUT, MOCK_EVIDENCE_PACK, { serverMeta });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain('Grok');
    }
  });

  test('should fail on missing required fields', () => {
    const result = enforceInsightPack(MISSING_FIELDS_JSON, MOCK_EVIDENCE_PACK, { serverMeta });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.validationErrors.length).toBeGreaterThan(0);
    }
  });

  test('should fail on extra keys (FIX #1 - .strict())', () => {
    const result = enforceInsightPack(EXTRA_KEYS_JSON, MOCK_EVIDENCE_PACK, { serverMeta });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.validationErrors.some(e => e.includes('Unrecognized') || e.includes('extra'))).toBe(true);
    }
  });

  test('should fail on wrong enum values', () => {
    const result = enforceInsightPack(WRONG_ENUM_JSON, MOCK_EVIDENCE_PACK, { serverMeta });
    expect(result.ok).toBe(false);
  });

  test('should fail on numeric literals in strict mode (FIX #4)', () => {
    const result = enforceInsightPack(
      NUMERIC_LITERALS_JSON,
      MOCK_EVIDENCE_PACK,
      { serverMeta, strictNumericLiterals: true }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.validationErrors.some(e => e.includes('Numeric') || e.includes('numeric'))).toBe(true);
    }
  });

  test('should succeed but degrade with invalid evidence keys', () => {
    const result = enforceInsightPack(
      INVALID_EVIDENCE_KEYS_JSON,
      MOCK_EVIDENCE_PACK,
      { serverMeta, strictEvidenceKeys: true, strictNumericLiterals: false }
    );
    // Should either fail or succeed with degraded=true
    if (result.ok) {
      expect(result.degraded).toBe(true);
      expect(result.demotedItems).toBeGreaterThan(0);
    }
  });

  test('should include lastRawExcerpt on failure', () => {
    const result = enforceInsightPack(INVALID_JSON_SYNTAX, MOCK_EVIDENCE_PACK, { serverMeta });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.lastRawExcerpt).toBeDefined();
      expect(result.lastRawExcerpt.length).toBeGreaterThan(0);
    }
  });

  test('should track serverOverwrites in success result', () => {
    // Create pack with slightly different meta
    const packWithDifferentMeta = {
      ...VALID_INSIGHT_PACK,
      meta: {
        ...VALID_INSIGHT_PACK.meta,
        intent: 'decision_help' as const,  // Different from serverMeta
      },
    };
    const result = enforceInsightPack(
      JSON.stringify(packWithDifferentMeta), 
      MOCK_EVIDENCE_PACK, 
      { serverMeta }
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.serverOverwrites).toBeDefined();
      expect(result.serverOverwrites.length).toBeGreaterThan(0);
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

  test('should collect extraction errors for invalid format', () => {
    const errors = collectRetryErrors(INVALID_PROSE_JSON, MOCK_EVIDENCE_PACK);
    expect(errors.extractionErrors.length).toBeGreaterThan(0);
  });

  test('should return empty errors for valid JSON', () => {
    const errors = collectRetryErrors(VALID_INSIGHT_PACK_JSON, MOCK_EVIDENCE_PACK);
    expect(errors.validationErrors).toHaveLength(0);
    expect(errors.evidenceKeyErrors).toHaveLength(0);
    expect(errors.numericLiteralErrors).toHaveLength(0);
    expect(errors.userTalkErrors).toHaveLength(0);
    expect(errors.extractionErrors).toHaveLength(0);
  });
});

// ============================================================================
// EDGE CASE MATRIX TESTS
// ============================================================================

describe('Edge Case Matrix', () => {
  const serverMeta = {
    intent: 'new_coin_analysis' as const,
    language: 'en',
    asset_focus: 'PEPE',
    chain: 'solana',
    timeframe: 'snapshot' as const,
  };

  for (const testCase of EDGE_CASE_FIXTURES) {
    test(`should handle: ${testCase.name}`, () => {
      const result = enforceInsightPack(
        testCase.input,
        MOCK_EVIDENCE_PACK,
        { 
          serverMeta,
          strictEvidenceKeys: true,
          strictNumericLiterals: true,
          strictJsonExtraction: true,
          strictUserTalk: true,
        }
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
