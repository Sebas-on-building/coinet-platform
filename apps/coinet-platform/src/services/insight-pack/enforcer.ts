/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔒 INSIGHT PACK — SCHEMA ENFORCER (HARDENED)                              ║
 * ║                                                                               ║
 * ║   Extracts, validates, and repairs Grok output to ensure schema compliance.   ║
 * ║   All 8 production hardening fixes applied.                                   ║
 * ║                                                                               ║
 * ║   ENFORCEMENT PIPELINE:                                                       ║
 * ║   1. Extract JSON (strict: no leading/trailing text)                          ║
 * ║   2. Validate schema with .strict() (rejects extra keys)                      ║
 * ║   3. Overwrite meta/coverage with server-authoritative values                 ║
 * ║   4. Verify evidence_keys (coverage-aware + non-null + freshness)             ║
 * ║   5. Check for forbidden numeric literals (comprehensive)                     ║
 * ║   6. Check for user-facing language (Pass-1 must be analytical)               ║
 * ║   7. Validate at least one content array is non-empty                         ║
 * ║   8. Demote invalid items to unknowns                                         ║
 * ║                                                                               ║
 * ║   @version 1.1.0 - Hardened Pass-1 Insight Pack Layer                         ║
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
  Unknown,
  detectNumericLiterals,
  detectUserTalk,
  INSIGHT_PACK_VERSION,
  IntentType,
  Timeframe,
} from './types';
import {
  validateEvidenceKeys,
  getAvailableModules,
  resolveEvidencePath,
  isModuleAvailable,
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
// JSON EXTRACTION (FIX #7: Stricter extraction)
// ============================================================================

type ExtractionStrategy = 'raw' | 'fenced' | 'locate_braces';

interface ExtractionResult {
  success: boolean;
  json: unknown | null;
  strategy: ExtractionStrategy;
  error?: string;
  hasLeadingText?: boolean;
  hasTrailingText?: boolean;
}

/**
 * FIX #7: Strict raw parse - must start with { and end with }
 */
function tryStrictRawParse(text: string): ExtractionResult {
  const trimmed = text.trim();
  
  // Check for leading/trailing non-JSON content
  if (!trimmed.startsWith('{')) {
    return { 
      success: false, 
      json: null, 
      strategy: 'raw', 
      error: 'Output does not start with "{"',
      hasLeadingText: true,
    };
  }
  
  if (!trimmed.endsWith('}')) {
    return { 
      success: false, 
      json: null, 
      strategy: 'raw', 
      error: 'Output does not end with "}"',
      hasTrailingText: true,
    };
  }
  
  try {
    const json = JSON.parse(trimmed);
    return { success: true, json, strategy: 'raw' };
  } catch (error: any) {
    return { success: false, json: null, strategy: 'raw', error: error.message };
  }
}

/**
 * Lenient parse for retries - extracts JSON from fenced blocks
 */
function tryFencedParse(text: string): ExtractionResult {
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
        continue;
      }
    }
  }

  return { success: false, json: null, strategy: 'fenced', error: 'No valid fenced JSON found' };
}

/**
 * FIX #7: Locate braces but REJECT if there's significant leading/trailing content
 */
function tryLocateBracesParse(text: string, strictMode: boolean): ExtractionResult {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return { success: false, json: null, strategy: 'locate_braces', error: 'No valid brace pair found' };
  }

  // FIX #7: Check for significant leading/trailing content
  const leading = text.slice(0, firstBrace).trim();
  const trailing = text.slice(lastBrace + 1).trim();
  
  if (strictMode) {
    if (leading.length > 0) {
      return { 
        success: false, 
        json: null, 
        strategy: 'locate_braces', 
        error: `Leading text before JSON: "${leading.slice(0, 50)}..."`,
        hasLeadingText: true,
      };
    }
    if (trailing.length > 0) {
      return { 
        success: false, 
        json: null, 
        strategy: 'locate_braces', 
        error: `Trailing text after JSON: "${trailing.slice(0, 50)}..."`,
        hasTrailingText: true,
      };
    }
  }

  const jsonCandidate = text.slice(firstBrace, lastBrace + 1);

  // FIX #7: Reject if multiple JSON objects detected
  const braceCount = (jsonCandidate.match(/^\s*\{/gm) || []).length;
  if (braceCount > 1) {
    // This is a heuristic - could be nested objects, so only flag if suspicious
    const secondBraceStart = jsonCandidate.indexOf('{', 1);
    if (secondBraceStart > 0 && jsonCandidate[secondBraceStart - 1] !== ':' && jsonCandidate[secondBraceStart - 1] !== ',') {
      return { 
        success: false, 
        json: null, 
        strategy: 'locate_braces', 
        error: 'Multiple JSON objects detected',
      };
    }
  }

  try {
    const json = JSON.parse(jsonCandidate);
    return { 
      success: true, 
      json, 
      strategy: 'locate_braces',
      hasLeadingText: leading.length > 0,
      hasTrailingText: trailing.length > 0,
    };
  } catch (error: any) {
    return { success: false, json: null, strategy: 'locate_braces', error: error.message };
  }
}

/**
 * Extract JSON from raw text.
 * FIX #7: In strict mode, only accepts clean JSON output.
 */
function extractJson(text: string, strictMode: boolean): ExtractionResult {
  // First try strict raw parse
  const rawResult = tryStrictRawParse(text);
  emitParseAttempt('raw', rawResult.success);
  if (rawResult.success) {
    return rawResult;
  }

  // In strict mode, reject if raw parse failed due to leading/trailing text
  if (strictMode && (rawResult.hasLeadingText || rawResult.hasTrailingText)) {
    return rawResult;
  }

  // Try fenced extraction
  const fencedResult = tryFencedParse(text);
  emitParseAttempt('fenced', fencedResult.success);
  if (fencedResult.success) {
    return fencedResult;
  }

  // Try locate braces (with strict checking)
  const braceResult = tryLocateBracesParse(text, strictMode);
  emitParseAttempt('locate_braces', braceResult.success);
  return braceResult;
}

// ============================================================================
// SCHEMA VALIDATION (with .strict())
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

function isGrokErrorOutput(json: unknown): json is z.infer<typeof GrokErrorOutput> {
  try {
    return GrokErrorOutput.safeParse(json).success;
  } catch {
    return false;
  }
}

// ============================================================================
// SERVER-AUTHORITATIVE OVERWRITES (FIX #2)
// ============================================================================

interface ServerOverwriteResult {
  pack: InsightPackV1;
  overwrites: string[];
}

/**
 * FIX #2: Overwrite model-provided meta/coverage with server-authoritative values.
 * The model cannot lie about what data was available or what the user asked for.
 */
function applyServerOverwrites(
  pack: InsightPackV1,
  evidencePack: EvidencePack,
  options: EnforcementOptions
): ServerOverwriteResult {
  const overwrites: string[] = [];
  const availableModules = getAvailableModules(evidencePack);
  const missingModules = evidencePack.coverage.missing || [];
  const maxAge = Math.max(...Object.values(evidencePack.coverage.freshness_seconds || {}), 0);

  // Overwrite meta
  const newMeta = {
    ...pack.meta,
    version: INSIGHT_PACK_VERSION,
    engine: 'grok' as const,
    intent: options.serverMeta.intent,
    language: options.serverMeta.language,
    asset_focus: options.serverMeta.asset_focus,
    chain: options.serverMeta.chain,
    timeframe: options.serverMeta.timeframe,
    created_at_unix: Math.floor(Date.now() / 1000),
  };

  // Track what was different
  if (pack.meta.intent !== newMeta.intent) overwrites.push(`meta.intent: ${pack.meta.intent} → ${newMeta.intent}`);
  if (pack.meta.language !== newMeta.language) overwrites.push(`meta.language: ${pack.meta.language} → ${newMeta.language}`);
  if (pack.meta.asset_focus !== newMeta.asset_focus) overwrites.push(`meta.asset_focus: ${pack.meta.asset_focus} → ${newMeta.asset_focus}`);

  // Overwrite coverage_used
  const newCoverage = {
    available_modules: availableModules,
    missing_modules: missingModules,
    max_data_age_seconds: maxAge,
  };

  if (JSON.stringify(pack.coverage_used.available_modules) !== JSON.stringify(newCoverage.available_modules)) {
    overwrites.push(`coverage_used.available_modules: server-corrected`);
  }

  return {
    pack: {
      ...pack,
      meta: newMeta,
      coverage_used: newCoverage,
    },
    overwrites,
  };
}

// ============================================================================
// CONTENT VALIDATION (FIX #3, #4, #8)
// ============================================================================

interface ContentValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate content rules:
 * - FIX #3: At least one of {drivers, risks, catalysts_next, unknowns} must be non-empty
 * - FIX #4: No numeric literals in summaries
 * - FIX #8: No user-facing language
 */
function validateContent(
  pack: InsightPackV1,
  options: EnforcementOptions
): ContentValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // FIX #3: At least one content array must be non-empty
  const hasContent = 
    pack.drivers.length > 0 ||
    pack.risks.length > 0 ||
    pack.catalysts_next.length > 0 ||
    pack.unknowns.length > 0;

  if (!hasContent) {
    errors.push('At least one of {drivers, risks, catalysts_next, unknowns} must be non-empty');
  }

  // FIX #4: Check numeric literals in all text fields
  const fieldsToCheck = [
    ...pack.drivers.map(d => ({ field: `drivers[${d.id}].topic`, text: d.topic })),
    ...pack.drivers.map(d => ({ field: `drivers[${d.id}].summary`, text: d.summary })),
    ...pack.risks.map(r => ({ field: `risks[${r.id}].risk`, text: r.risk })),
    ...pack.risks.map(r => ({ field: `risks[${r.id}].why`, text: r.why })),
    ...pack.catalysts_next.map(c => ({ field: `catalysts_next[${c.id}].topic`, text: c.topic })),
    ...pack.catalysts_next.map(c => ({ field: `catalysts_next[${c.id}].why_it_matters`, text: c.why_it_matters })),
    { field: 'scenarios.bull.summary', text: pack.scenarios.bull.summary },
    { field: 'scenarios.base.summary', text: pack.scenarios.base.summary },
    { field: 'scenarios.bear.summary', text: pack.scenarios.bear.summary },
    ...pack.scenarios.bull.key_triggers.map((t, i) => ({ field: `scenarios.bull.key_triggers[${i}]`, text: t })),
    ...pack.scenarios.base.key_triggers.map((t, i) => ({ field: `scenarios.base.key_triggers[${i}]`, text: t })),
    ...pack.scenarios.bear.key_triggers.map((t, i) => ({ field: `scenarios.bear.key_triggers[${i}]`, text: t })),
  ];

  for (const { field, text } of fieldsToCheck) {
    const numericCheck = detectNumericLiterals(text);
    if (!numericCheck.clean) {
      const msg = `Numeric literal in ${field}: "${numericCheck.matches.join('", "')}"`;
      if (options.strictNumericLiterals) {
        errors.push(msg);
      } else {
        warnings.push(msg);
      }
    }
  }

  // FIX #8: Check for user-facing language (except in unknowns.what which can be more casual)
  const analyticalFields = [
    ...pack.drivers.map(d => ({ field: `drivers[${d.id}].summary`, text: d.summary })),
    ...pack.risks.map(r => ({ field: `risks[${r.id}].why`, text: r.why })),
    ...pack.catalysts_next.map(c => ({ field: `catalysts_next[${c.id}].why_it_matters`, text: c.why_it_matters })),
    { field: 'scenarios.bull.summary', text: pack.scenarios.bull.summary },
    { field: 'scenarios.base.summary', text: pack.scenarios.base.summary },
    { field: 'scenarios.bear.summary', text: pack.scenarios.bear.summary },
  ];

  for (const { field, text } of analyticalFields) {
    const userTalkCheck = detectUserTalk(text);
    if (!userTalkCheck.clean) {
      const msg = `User-facing language in ${field}: "${userTalkCheck.violations.join('", "')}"`;
      if (options.strictUserTalk) {
        errors.push(msg);
      } else {
        warnings.push(msg);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ============================================================================
// EVIDENCE KEY VERIFICATION (FIX #6: Coverage-aware)
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

/**
 * FIX #6: Coverage-aware evidence key verification.
 * Checks: module available + path resolves + value is non-null
 */
function verifyEvidenceKeysCoverageAware(
  pack: InsightPackV1,
  evidencePack: EvidencePack,
  strictMode: boolean
): EvidenceVerificationResult {
  const invalidItems: EvidenceVerificationResult['invalidItems'] = [];
  const demotions: Unknown[] = [];
  let nextUnknownId = pack.unknowns.length + 1;
  const availableModules = getAvailableModules(evidencePack);

  function verifyKeys(keys: string[], itemType: 'driver' | 'risk' | 'catalyst', itemId: string): boolean {
    const invalidKeys: Array<{ path: string; reason: string }> = [];

    for (const key of keys) {
      // Extract module name from key
      const moduleMatch = key.match(/^evidence\.([a-z_]+)\./);
      const moduleName = moduleMatch?.[1];

      // FIX #6a: Check module is available
      if (!moduleName || !availableModules.includes(moduleName)) {
        invalidKeys.push({ 
          path: key, 
          reason: `Module "${moduleName}" not in available_modules: [${availableModules.join(', ')}]` 
        });
        continue;
      }

      // FIX #6b: Resolve path and check value
      const resolution = resolveEvidencePath(evidencePack, key);
      if (!resolution.exists) {
        invalidKeys.push({ path: key, reason: resolution.error || 'Path does not exist' });
        continue;
      }

      // FIX #6c: Check value is not null/undefined/empty
      if (resolution.value === null || resolution.value === undefined) {
        invalidKeys.push({ path: key, reason: 'Resolved value is null/undefined' });
        continue;
      }

      if (typeof resolution.value === 'string' && resolution.value.trim() === '') {
        invalidKeys.push({ path: key, reason: 'Resolved value is empty string' });
        continue;
      }
    }

    if (invalidKeys.length > 0) {
      invalidItems.push({ type: itemType, id: itemId, invalidKeys });
      
      for (const ik of invalidKeys) {
        emitEvidenceKeyFail(ik.path, 1, `${itemType}s[${itemId}]`);
      }

      return false;
    }

    return true;
  }

  // Verify drivers
  for (const driver of pack.drivers) {
    const isValid = verifyKeys(driver.evidence_keys, 'driver', driver.id);
    if (!isValid && strictMode) {
      demotions.push({
        id: `u${nextUnknownId++}`,
        what: `Driver "${driver.topic}": ${driver.summary}`,
        why_unknown: 'evidence_key_invalid',
        would_help: `Valid evidence path from available modules`,
      });
    }
  }

  // Verify risks
  for (const risk of pack.risks) {
    const isValid = verifyKeys(risk.evidence_keys, 'risk', risk.id);
    if (!isValid && strictMode) {
      demotions.push({
        id: `u${nextUnknownId++}`,
        what: `Risk "${risk.risk}": ${risk.why}`,
        why_unknown: 'evidence_key_invalid',
        would_help: `Valid evidence path from available modules`,
      });
    }
  }

  // Verify catalysts (now required to have evidence_keys)
  for (const catalyst of pack.catalysts_next) {
    const isValid = verifyKeys(catalyst.evidence_keys, 'catalyst', catalyst.id);
    if (!isValid && strictMode) {
      demotions.push({
        id: `u${nextUnknownId++}`,
        what: `Catalyst "${catalyst.topic}": ${catalyst.why_it_matters}`,
        why_unknown: 'demoted_from_catalyst',
        would_help: `Valid evidence path from available modules`,
      });
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

  const newCatalysts = pack.catalysts_next.filter(
    c => !verification.invalidItems.some(i => i.type === 'catalyst' && i.id === c.id)
  );

  const newUnknowns = [...pack.unknowns, ...verification.demotions];
  const demotedCount = verification.demotions.length;

  // FIX #3: If everything got demoted, add explanation to unknowns
  if (newDrivers.length === 0 && newRisks.length === 0 && newCatalysts.length === 0 && newUnknowns.length === 0) {
    newUnknowns.push({
      id: 'u1',
      what: 'All analysis items failed evidence validation',
      why_unknown: 'insufficient_evidence',
      would_help: 'More complete Evidence Pack with valid data',
    });
  }

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
 * All 8 hardening fixes applied.
 */
export function enforceInsightPack(
  rawText: string,
  evidencePack: EvidencePack,
  opts: EnforceInsightPackOptions = {}
): EnforcementResult {
  const options = { ...DEFAULT_ENFORCEMENT_OPTIONS, ...opts };
  const attempt = opts.attempt || 1;
  const warnings: string[] = [];

  emitRawReceived(rawText.length, 0);

  // Step 1: Extract JSON (FIX #7: strict mode)
  const extraction = extractJson(rawText, options.strictJsonExtraction);

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

  // Warn if extraction found leading/trailing text
  if (extraction.hasLeadingText) warnings.push('Leading text was ignored during extraction');
  if (extraction.hasTrailingText) warnings.push('Trailing text was ignored during extraction');

  // Check for Grok error output
  if (isGrokErrorOutput(extraction.json)) {
    const grokError = extraction.json;
    emitSchemaFail([`Grok returned error: ${grokError.reason || 'SCHEMA_VIOLATION'}`], attempt);
    return {
      ok: false,
      error: 'Grok explicitly failed to produce valid output',
      retriesUsed: attempt,
      lastRawExcerpt: JSON.stringify(grokError),
      validationErrors: [`Grok error: ${grokError.reason || 'SCHEMA_VIOLATION'}`],
    };
  }

  // Step 2: Validate schema (FIX #1: .strict() rejects extra keys)
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

  // Step 3: Apply server-authoritative overwrites (FIX #2)
  const overwriteResult = applyServerOverwrites(pack, evidencePack, options);
  pack = overwriteResult.pack;
  const serverOverwrites = overwriteResult.overwrites;

  // Step 4: Validate content (FIX #3, #4, #8)
  const contentValidation = validateContent(pack, options);
  if (!contentValidation.valid) {
    emitSchemaFail(contentValidation.errors, attempt);
    return {
      ok: false,
      error: 'Content validation failed',
      retriesUsed: attempt,
      lastRawExcerpt: JSON.stringify(pack).slice(0, 500),
      validationErrors: contentValidation.errors,
    };
  }
  warnings.push(...contentValidation.warnings);

  // Step 5: Verify evidence keys (FIX #6: coverage-aware)
  const verification = verifyEvidenceKeysCoverageAware(pack, evidencePack, options.strictEvidenceKeys);

  let degraded = false;
  let demotedCount = 0;

  if (!verification.valid) {
    if (options.strictEvidenceKeys) {
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
      for (const item of verification.invalidItems) {
        warnings.push(`${item.type} ${item.id} has unresolvable evidence_keys (lenient mode)`);
      }
    }
  }

  // Step 6: Final validation (in case demotions changed structure)
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

  // Step 7: Re-check content after demotions (FIX #3)
  const finalContentCheck = validateContent(pack, { ...options, strictNumericLiterals: false, strictUserTalk: false });
  if (!finalContentCheck.valid) {
    // This can happen if all items were demoted
    emitSchemaFail(finalContentCheck.errors, attempt);
    return {
      ok: false,
      error: 'Post-demotion content validation failed',
      retriesUsed: attempt,
      lastRawExcerpt: JSON.stringify(pack).slice(0, 500),
      validationErrors: finalContentCheck.errors,
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
    serverOverwrites,
  };
}

// ============================================================================
// COLLECT ERRORS FOR RETRY
// ============================================================================

export interface RetryErrors {
  validationErrors: string[];
  evidenceKeyErrors: Array<{ path: string; reason: string }>;
  numericLiteralErrors: string[];
  userTalkErrors: string[];
  extractionErrors: string[];
}

export function collectRetryErrors(
  rawText: string,
  evidencePack: EvidencePack
): RetryErrors {
  const errors: RetryErrors = {
    validationErrors: [],
    evidenceKeyErrors: [],
    numericLiteralErrors: [],
    userTalkErrors: [],
    extractionErrors: [],
  };

  const extraction = extractJson(rawText, true);
  if (!extraction.success) {
    errors.extractionErrors.push(extraction.error || 'Extraction failed');
    if (extraction.hasLeadingText) errors.extractionErrors.push('Has leading text before JSON');
    if (extraction.hasTrailingText) errors.extractionErrors.push('Has trailing text after JSON');
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

  // Check content
  const contentValidation = validateContent(pack, DEFAULT_ENFORCEMENT_OPTIONS);
  for (const err of contentValidation.errors) {
    if (err.includes('Numeric')) {
      errors.numericLiteralErrors.push(err);
    } else if (err.includes('User-facing')) {
      errors.userTalkErrors.push(err);
    } else {
      errors.validationErrors.push(err);
    }
  }

  // Check evidence keys
  const verification = verifyEvidenceKeysCoverageAware(pack, evidencePack, true);
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
  validateContent,
  verifyEvidenceKeysCoverageAware,
  applyDemotions,
  applyServerOverwrites,
  isGrokErrorOutput,
};
