/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔒 INSIGHT PACK — SCHEMA ENFORCER                                         ║
 * ║                                                                               ║
 * ║   Extracts, validates, and repairs Grok output to ensure schema compliance.   ║
 * ║   Verifies evidence_keys and enforces no-numbers policy.                      ║
 * ║                                                                               ║
 * ║   ENFORCEMENT PIPELINE:                                                       ║
 * ║   1. Extract JSON (raw / fenced / locate braces)                              ║
 * ║   2. Validate schema (zod)                                                    ║
 * ║   3. Verify evidence_keys against Evidence Pack                               ║
 * ║   4. Check for forbidden numeric literals                                     ║
 * ║   5. Demote invalid items to unknowns                                         ║
 * ║   6. Retry with error injection if needed                                     ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Pass-1 Insight Pack Layer                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { z } from 'zod';
import { logger } from '../../utils/logger';
import { EvidencePack } from '../evidence-pack/types';
import {
  InsightPackV1Schema,
  InsightPackV1,
  GrokErrorOutput,
  EnforcementResult,
  EnforcementOptions,
  DEFAULT_ENFORCEMENT_OPTIONS,
  Driver,
  Risk,
  Catalyst,
  Unknown,
  containsNumericLiteral,
  INSIGHT_PACK_VERSION,
} from './types';
import {
  validateEvidenceKeys,
  getAvailableModules,
  resolveEvidencePath,
} from './evidence-resolver';
import {
  emitRawReceived,
  emitParseAttempt,
  emitSchemaFail,
  emitEvidenceKeyFail,
  emitDegraded,
  emitSuccess,
} from './observability';

// ============================================================================
// JSON EXTRACTION STRATEGIES
// ============================================================================

type ExtractionStrategy = 'raw' | 'fenced' | 'locate_braces';

interface ExtractionResult {
  success: boolean;
  json: unknown | null;
  strategy: ExtractionStrategy;
  error?: string;
}

/**
 * Try to parse raw text as JSON directly.
 */
function tryRawParse(text: string): ExtractionResult {
  try {
    const json = JSON.parse(text.trim());
    return { success: true, json, strategy: 'raw' };
  } catch (error: any) {
    return { success: false, json: null, strategy: 'raw', error: error.message };
  }
}

/**
 * Try to extract JSON from markdown code fences.
 */
function tryFencedParse(text: string): ExtractionResult {
  // Match ```json ... ``` or ``` ... ```
  const fencePatterns = [
    /```json\s*([\s\S]*?)```/i,
    /```\s*([\s\S]*?)```/,
  ];

  for (const pattern of fencePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      try {
        const json = JSON.parse(match[1].trim());
        return { success: true, json, strategy: 'fenced' };
      } catch {
        // Continue to next pattern
      }
    }
  }

  return { success: false, json: null, strategy: 'fenced', error: 'No valid fenced JSON found' };
}

/**
 * Try to locate first "{" and last "}" and parse between them.
 */
function tryLocateBracesParse(text: string): ExtractionResult {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return { success: false, json: null, strategy: 'locate_braces', error: 'No valid brace pair found' };
  }

  const jsonCandidate = text.slice(firstBrace, lastBrace + 1);

  try {
    const json = JSON.parse(jsonCandidate);
    return { success: true, json, strategy: 'locate_braces' };
  } catch (error: any) {
    return { success: false, json: null, strategy: 'locate_braces', error: error.message };
  }
}

/**
 * Extract JSON from raw text using multiple strategies.
 */
function extractJson(text: string): ExtractionResult {
  // Try strategies in order of strictness
  const strategies: Array<() => ExtractionResult> = [
    () => tryRawParse(text),
    () => tryFencedParse(text),
    () => tryLocateBracesParse(text),
  ];

  for (const strategy of strategies) {
    const result = strategy();
    emitParseAttempt(result.strategy, result.success);
    if (result.success) {
      return result;
    }
  }

  return { success: false, json: null, strategy: 'locate_braces', error: 'All extraction strategies failed' };
}

// ============================================================================
// SCHEMA VALIDATION
// ============================================================================

interface SchemaValidationResult {
  valid: boolean;
  data: InsightPackV1 | null;
  errors: string[];
}

function validateSchema(json: unknown): SchemaValidationResult {
  const result = InsightPackV1Schema.safeParse(json);

  if (result.success) {
    return { valid: true, data: result.data, errors: [] };
  }

  const errors = result.error.errors.map(e => {
    const path = e.path.join('.');
    return `${path}: ${e.message}`;
  });

  return { valid: false, data: null, errors };
}

// ============================================================================
// GROK ERROR OUTPUT CHECK
// ============================================================================

function isGrokErrorOutput(json: unknown): json is GrokErrorOutput {
  try {
    return GrokErrorOutput.safeParse(json).success;
  } catch {
    return false;
  }
}

// ============================================================================
// NUMERIC LITERAL CHECK
// ============================================================================

interface NumericCheckResult {
  clean: boolean;
  violations: Array<{ field: string; text: string; match: string }>;
}

function checkNumericLiterals(pack: InsightPackV1): NumericCheckResult {
  const violations: Array<{ field: string; text: string; match: string }> = [];

  // Check drivers
  for (const driver of pack.drivers) {
    if (containsNumericLiteral(driver.summary)) {
      const match = driver.summary.match(/\b\d+(?:\.\d+)?(?:\s*%|\s*hours?|\s*days?|\s*[KMBkmb]|\s*USD|\s*\$)?\b/);
      violations.push({
        field: `drivers[${driver.id}].summary`,
        text: driver.summary,
        match: match?.[0] || 'numeric',
      });
    }
  }

  // Check risks
  for (const risk of pack.risks) {
    if (containsNumericLiteral(risk.why)) {
      const match = risk.why.match(/\b\d+(?:\.\d+)?(?:\s*%|\s*hours?|\s*days?|\s*[KMBkmb]|\s*USD|\s*\$)?\b/);
      violations.push({
        field: `risks[${risk.id}].why`,
        text: risk.why,
        match: match?.[0] || 'numeric',
      });
    }
  }

  // Check scenarios
  for (const [scenarioName, scenario] of Object.entries(pack.scenarios)) {
    if (containsNumericLiteral(scenario.summary)) {
      const match = scenario.summary.match(/\b\d+(?:\.\d+)?(?:\s*%|\s*hours?|\s*days?|\s*[KMBkmb]|\s*USD|\s*\$)?\b/);
      violations.push({
        field: `scenarios.${scenarioName}.summary`,
        text: scenario.summary,
        match: match?.[0] || 'numeric',
      });
    }
  }

  return {
    clean: violations.length === 0,
    violations,
  };
}

// ============================================================================
// EVIDENCE KEY VERIFICATION
// ============================================================================

interface EvidenceVerificationResult {
  valid: boolean;
  invalidItems: Array<{
    type: 'driver' | 'risk' | 'catalyst';
    id: string;
    invalidKeys: Array<{ path: string; reason: string }>;
  }>;
  demotions: Unknown[];
}

function verifyEvidenceKeys(
  pack: InsightPackV1,
  evidencePack: EvidencePack,
  strictMode: boolean
): EvidenceVerificationResult {
  const invalidItems: EvidenceVerificationResult['invalidItems'] = [];
  const demotions: Unknown[] = [];
  let nextUnknownId = pack.unknowns.length + 1;

  // Verify drivers
  for (const driver of pack.drivers) {
    const validation = validateEvidenceKeys(evidencePack, driver.evidence_keys);
    if (!validation.valid) {
      invalidItems.push({
        type: 'driver',
        id: driver.id,
        invalidKeys: validation.invalidKeys,
      });

      // Emit event
      for (const ik of validation.invalidKeys) {
        emitEvidenceKeyFail(ik.path, 1, `drivers[${driver.id}]`);
      }

      if (strictMode) {
        // Demote to unknown
        demotions.push({
          id: `u${nextUnknownId++}`,
          what: `Driver "${driver.topic}": ${driver.summary}`,
          why_unknown: 'evidence_key_invalid',
          would_help: `Valid evidence path for: ${validation.invalidKeys.map(k => k.path).join(', ')}`,
        });
      }
    }
  }

  // Verify risks
  for (const risk of pack.risks) {
    const validation = validateEvidenceKeys(evidencePack, risk.evidence_keys);
    if (!validation.valid) {
      invalidItems.push({
        type: 'risk',
        id: risk.id,
        invalidKeys: validation.invalidKeys,
      });

      for (const ik of validation.invalidKeys) {
        emitEvidenceKeyFail(ik.path, 1, `risks[${risk.id}]`);
      }

      if (strictMode) {
        demotions.push({
          id: `u${nextUnknownId++}`,
          what: `Risk "${risk.risk}": ${risk.why}`,
          why_unknown: 'evidence_key_invalid',
          would_help: `Valid evidence path for: ${validation.invalidKeys.map(k => k.path).join(', ')}`,
        });
      }
    }
  }

  // Verify catalysts (empty evidence_keys allowed)
  for (const catalyst of pack.catalysts_next) {
    if (catalyst.evidence_keys.length > 0) {
      const validation = validateEvidenceKeys(evidencePack, catalyst.evidence_keys);
      if (!validation.valid) {
        invalidItems.push({
          type: 'catalyst',
          id: catalyst.id,
          invalidKeys: validation.invalidKeys,
        });

        for (const ik of validation.invalidKeys) {
          emitEvidenceKeyFail(ik.path, 1, `catalysts_next[${catalyst.id}]`);
        }

        // For catalysts, we just clear invalid keys rather than demoting
      }
    }
  }

  return {
    valid: invalidItems.length === 0,
    invalidItems,
    demotions,
  };
}

// ============================================================================
// REPAIR / DEMOTION
// ============================================================================

function applyDemotions(
  pack: InsightPackV1,
  verification: EvidenceVerificationResult
): { pack: InsightPackV1; demotedCount: number } {
  const newDrivers = pack.drivers.filter(
    d => !verification.invalidItems.some(i => i.type === 'driver' && i.id === d.id)
  );

  const newRisks = pack.risks.filter(
    r => !verification.invalidItems.some(i => i.type === 'risk' && i.id === r.id)
  );

  // For catalysts, just clear invalid keys
  const newCatalysts = pack.catalysts_next.map(c => {
    const item = verification.invalidItems.find(i => i.type === 'catalyst' && i.id === c.id);
    if (item) {
      return {
        ...c,
        evidence_keys: c.evidence_keys.filter(
          k => !item.invalidKeys.some(ik => ik.path === k)
        ),
      };
    }
    return c;
  });

  const newUnknowns = [...pack.unknowns, ...verification.demotions];

  // Ensure at least one driver remains
  if (newDrivers.length === 0) {
    // Create a fallback driver
    newDrivers.push({
      id: 'd1',
      topic: 'Insufficient data',
      summary: 'Unable to identify key drivers due to evidence validation failures',
      evidence_keys: [],
      confidence: 'low',
    });
  }

  const demotedCount = verification.demotions.length;

  return {
    pack: {
      ...pack,
      drivers: newDrivers,
      risks: newRisks,
      catalysts_next: newCatalysts,
      unknowns: newUnknowns,
      overall_confidence: demotedCount > 2 ? 'low' : pack.overall_confidence,
    },
    demotedCount,
  };
}

// ============================================================================
// MAIN ENFORCEMENT FUNCTION
// ============================================================================

export interface EnforceInsightPackOptions extends Partial<EnforcementOptions> {
  attempt?: number;
}

/**
 * Enforce schema compliance on Grok's raw output.
 * 
 * @param rawText - Raw text from Grok
 * @param evidencePack - The Evidence Pack used for this request
 * @param opts - Enforcement options
 * @returns EnforcementResult with success/failure and data/errors
 */
export function enforceInsightPack(
  rawText: string,
  evidencePack: EvidencePack,
  opts: EnforceInsightPackOptions = {}
): EnforcementResult {
  const options = { ...DEFAULT_ENFORCEMENT_OPTIONS, ...opts };
  const attempt = opts.attempt || 1;
  const warnings: string[] = [];

  // Emit raw received event
  emitRawReceived(rawText.length, 0); // latencyMs is tracked externally

  // Step 1: Extract JSON
  const extraction = extractJson(rawText);

  if (!extraction.success) {
    emitSchemaFail(['JSON extraction failed: ' + extraction.error], attempt);
    return {
      ok: false,
      error: 'Failed to extract JSON from Grok output',
      retriesUsed: attempt,
      lastRawExcerpt: rawText.slice(0, 500),
      validationErrors: ['JSON extraction failed: ' + extraction.error],
    };
  }

  // Check for Grok error output
  if (isGrokErrorOutput(extraction.json)) {
    const grokError = extraction.json as GrokErrorOutput;
    emitSchemaFail([`Grok returned error: ${grokError.reason || 'SCHEMA_VIOLATION'}`], attempt);
    return {
      ok: false,
      error: 'Grok explicitly failed to produce valid output',
      retriesUsed: attempt,
      lastRawExcerpt: JSON.stringify(grokError),
      validationErrors: [`Grok error: ${grokError.reason || 'SCHEMA_VIOLATION'}`],
    };
  }

  // Step 2: Validate schema
  const schemaResult = validateSchema(extraction.json);

  if (!schemaResult.valid) {
    emitSchemaFail(schemaResult.errors, attempt);
    return {
      ok: false,
      error: 'Schema validation failed',
      retriesUsed: attempt,
      lastRawExcerpt: JSON.stringify(extraction.json).slice(0, 500),
      validationErrors: schemaResult.errors,
    };
  }

  let pack = schemaResult.data!;

  // Step 3: Check numeric literals
  const numericCheck = checkNumericLiterals(pack);
  if (!numericCheck.clean) {
    const numericErrors = numericCheck.violations.map(
      v => `Numeric literal "${v.match}" found in ${v.field}`
    );
    
    // In strict mode, this is a failure
    if (options.strictEvidenceKeys) {
      emitSchemaFail(numericErrors, attempt);
      return {
        ok: false,
        error: 'Numeric literals found in summaries',
        retriesUsed: attempt,
        lastRawExcerpt: JSON.stringify(pack).slice(0, 500),
        validationErrors: numericErrors,
      };
    }

    // In lenient mode, just warn
    warnings.push(...numericErrors);
  }

  // Step 4: Verify evidence keys
  const verification = verifyEvidenceKeys(pack, evidencePack, options.strictEvidenceKeys);

  let degraded = false;
  let demotedCount = 0;

  if (!verification.valid) {
    if (options.strictEvidenceKeys) {
      // Apply demotions
      const result = applyDemotions(pack, verification);
      pack = result.pack;
      demotedCount = result.demotedCount;
      degraded = true;

      for (const item of verification.invalidItems) {
        warnings.push(
          `${item.type} ${item.id} had invalid evidence_keys: ${item.invalidKeys.map(k => k.path).join(', ')}`
        );
      }

      emitDegraded(demotedCount, verification.invalidItems.length);
    } else {
      // Just warn
      for (const item of verification.invalidItems) {
        warnings.push(
          `${item.type} ${item.id} has unresolvable evidence_keys (lenient mode)`
        );
      }
    }
  }

  // Step 5: Final validation (in case demotions broke something)
  const finalValidation = validateSchema(pack);
  if (!finalValidation.valid) {
    emitSchemaFail(finalValidation.errors, attempt);
    return {
      ok: false,
      error: 'Post-demotion validation failed',
      retriesUsed: attempt,
      lastRawExcerpt: JSON.stringify(pack).slice(0, 500),
      validationErrors: finalValidation.errors,
    };
  }

  // Success!
  emitSuccess(
    attempt,
    degraded,
    pack.drivers.length,
    pack.risks.length,
    pack.overall_confidence
  );

  return {
    ok: true,
    data: pack,
    degraded,
    warnings,
    attemptsUsed: attempt,
    demotedItems: demotedCount,
  };
}

// ============================================================================
// COLLECT ERRORS FOR RETRY
// ============================================================================

export interface RetryErrors {
  validationErrors: string[];
  evidenceKeyErrors: Array<{ path: string; reason: string }>;
  numericLiteralErrors: string[];
}

export function collectRetryErrors(
  rawText: string,
  evidencePack: EvidencePack
): RetryErrors {
  const errors: RetryErrors = {
    validationErrors: [],
    evidenceKeyErrors: [],
    numericLiteralErrors: [],
  };

  const extraction = extractJson(rawText);
  if (!extraction.success) {
    errors.validationErrors.push('Output is not valid JSON');
    return errors;
  }

  if (isGrokErrorOutput(extraction.json)) {
    errors.validationErrors.push('Grok returned error output instead of InsightPack');
    return errors;
  }

  const schemaResult = validateSchema(extraction.json);
  if (!schemaResult.valid) {
    errors.validationErrors.push(...schemaResult.errors);
    return errors;
  }

  const pack = schemaResult.data!;

  // Check numeric literals
  const numericCheck = checkNumericLiterals(pack);
  for (const v of numericCheck.violations) {
    errors.numericLiteralErrors.push(`"${v.match}" in ${v.field}`);
  }

  // Check evidence keys
  const verification = verifyEvidenceKeys(pack, evidencePack, true);
  for (const item of verification.invalidItems) {
    for (const ik of item.invalidKeys) {
      errors.evidenceKeyErrors.push({ path: ik.path, reason: ik.reason });
    }
  }

  return errors;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  extractJson,
  validateSchema,
  checkNumericLiterals,
  verifyEvidenceKeys,
  applyDemotions,
  isGrokErrorOutput,
};
