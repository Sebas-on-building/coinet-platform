/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔒 JSON SCHEMA ENFORCER — STRICT EXTRACTION, NOT "PLEASE OUTPUT JSON"    ║
 * ║                                                                               ║
 * ║   Pass-1 outputs MUST be schema-locked. If the provider emits prose or       ║
 * ║   markdown, we extract → validate → retry with error injection.              ║
 * ║                                                                               ║
 * ║   After max retries: engine is considered MISSING (not silently degraded).   ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Production hardening                                      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface SchemaField {
  path: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  enumValues?: string[];
  arrayItemType?: 'string' | 'object';
}

export interface SchemaDefinition {
  name: string;
  version: string;
  fields: SchemaField[];
}

export interface ExtractionResult<T> {
  success: boolean;
  data: T | null;
  rawInput: string;
  extractionMethod: 'direct_parse' | 'code_fence_extract' | 'json_block_extract' | 'repair_attempt';
  validationErrors: string[];
  retryCount: number;
}

export interface RetryContext {
  originalPrompt: string;
  previousErrors: string[];
  attemptNumber: number;
}

// ============================================================================
// INSIGHT PACK SCHEMA (STRICT)
// ============================================================================

export const INSIGHT_PACK_SCHEMA: SchemaDefinition = {
  name: 'InsightPack',
  version: '1.0.0',
  fields: [
    // Meta fields
    { path: 'meta.should_run_research', type: 'boolean', required: true },
    { path: 'meta.mode', type: 'string', required: true, enumValues: ['NO_RESEARCH', 'DUAL_RESEARCH'] },
    { path: 'meta.language', type: 'string', required: true },
    { path: 'meta.intent', type: 'string', required: true },
    { path: 'meta.asset_focus', type: 'object', required: true },
    { path: 'meta.asset_focus.symbol', type: 'string', required: false },
    { path: 'meta.asset_focus.chain', type: 'string', required: true },
    { path: 'meta.asset_focus.address', type: 'string', required: false },
    { path: 'meta.timeframe', type: 'string', required: true, enumValues: ['now', 'today', '24h', '7d', 'unknown'] },
    { path: 'meta.request_refresh', type: 'boolean', required: true },
    { path: 'meta.one_clarifier', type: 'string', required: false },
    
    // Insight fields
    { path: 'insight.drivers', type: 'array', required: true, arrayItemType: 'object' },
    { path: 'insight.catalysts_next', type: 'array', required: true, arrayItemType: 'object' },
    { path: 'insight.second_order_effects', type: 'array', required: true, arrayItemType: 'object' },
    { path: 'insight.risks', type: 'array', required: true, arrayItemType: 'object' },
    { path: 'insight.scenarios', type: 'object', required: true },
    { path: 'insight.scenarios.bull', type: 'string', required: true },
    { path: 'insight.scenarios.base', type: 'string', required: true },
    { path: 'insight.scenarios.bear', type: 'string', required: true },
    { path: 'insight.unknowns', type: 'array', required: true, arrayItemType: 'string' },
    { path: 'insight.overall_confidence', type: 'string', required: true, enumValues: ['high', 'medium', 'low'] },
  ],
};

export const RENDERER_ENVELOPE_SCHEMA: SchemaDefinition = {
  name: 'RendererEnvelope',
  version: '1.0.0',
  fields: [
    { path: 'output_language', type: 'string', required: true },
    { path: 'facts_used', type: 'array', required: true, arrayItemType: 'string' },
    { path: 'numbers_used', type: 'array', required: true, arrayItemType: 'string' },
    { path: 'asked_question', type: 'boolean', required: true },
    { path: 'final_answer', type: 'string', required: true },
  ],
};

// ============================================================================
// JSON EXTRACTION (MULTIPLE STRATEGIES)
// ============================================================================

/**
 * Extract JSON from potentially messy LLM output
 * Tries multiple strategies in order of reliability
 */
export function extractJSON(raw: string): { json: string | null; method: ExtractionResult<any>['extractionMethod'] } {
  const trimmed = raw.trim();
  
  // Strategy 1: Direct parse (cleanest case)
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      JSON.parse(trimmed);
      return { json: trimmed, method: 'direct_parse' };
    } catch {
      // Fall through to other strategies
    }
  }
  
  // Strategy 2: Extract from markdown code fence
  const codeFenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeFenceMatch) {
    const extracted = codeFenceMatch[1].trim();
    try {
      JSON.parse(extracted);
      return { json: extracted, method: 'code_fence_extract' };
    } catch {
      // Fall through
    }
  }
  
  // Strategy 3: Find JSON object boundaries
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const extracted = trimmed.substring(firstBrace, lastBrace + 1);
    try {
      JSON.parse(extracted);
      return { json: extracted, method: 'json_block_extract' };
    } catch {
      // Fall through
    }
  }
  
  // Strategy 4: Attempt basic repairs
  const repaired = attemptJSONRepair(trimmed);
  if (repaired) {
    return { json: repaired, method: 'repair_attempt' };
  }
  
  return { json: null, method: 'direct_parse' };
}

/**
 * Attempt basic JSON repairs for common LLM mistakes
 */
function attemptJSONRepair(raw: string): string | null {
  let attempt = raw;
  
  // Remove leading text before JSON
  const firstBrace = attempt.indexOf('{');
  if (firstBrace > 0) {
    attempt = attempt.substring(firstBrace);
  }
  
  // Remove trailing text after JSON
  const lastBrace = attempt.lastIndexOf('}');
  if (lastBrace !== -1 && lastBrace < attempt.length - 1) {
    attempt = attempt.substring(0, lastBrace + 1);
  }
  
  // Fix trailing commas (common LLM mistake)
  attempt = attempt.replace(/,\s*}/g, '}');
  attempt = attempt.replace(/,\s*]/g, ']');
  
  // Fix unquoted keys (very common)
  attempt = attempt.replace(/(\{|,)\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
  
  // Fix single quotes to double quotes
  attempt = attempt.replace(/'/g, '"');
  
  // Try parsing
  try {
    JSON.parse(attempt);
    return attempt;
  } catch {
    return null;
  }
}

// ============================================================================
// SCHEMA VALIDATION
// ============================================================================

/**
 * Validate parsed JSON against schema definition
 */
export function validateAgainstSchema(data: any, schema: SchemaDefinition): string[] {
  const errors: string[] = [];
  
  for (const field of schema.fields) {
    const value = getNestedValue(data, field.path);
    
    // Check required
    if (field.required && (value === undefined || value === null)) {
      errors.push(`Missing required field: ${field.path}`);
      continue;
    }
    
    // Skip optional fields that are missing
    if (value === undefined || value === null) continue;
    
    // Type check
    const actualType = getJSONType(value);
    if (actualType !== field.type) {
      errors.push(`Type mismatch at ${field.path}: expected ${field.type}, got ${actualType}`);
      continue;
    }
    
    // Enum check
    if (field.enumValues && !field.enumValues.includes(value)) {
      errors.push(`Invalid enum value at ${field.path}: "${value}" not in [${field.enumValues.join(', ')}]`);
    }
    
    // Array item type check
    if (field.type === 'array' && field.arrayItemType && Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const itemType = getJSONType(value[i]);
        if (itemType !== field.arrayItemType) {
          errors.push(`Array item type mismatch at ${field.path}[${i}]: expected ${field.arrayItemType}, got ${itemType}`);
        }
      }
    }
  }
  
  return errors;
}

function getNestedValue(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  
  return current;
}

function getJSONType(value: any): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

// ============================================================================
// RETRY PROMPT BUILDER
// ============================================================================

/**
 * Build error-injected retry prompt
 */
export function buildRetryPrompt(context: RetryContext): string {
  return `[CRITICAL: JSON PARSING FAILED]

Your previous output could not be parsed. Errors:
${context.previousErrors.map(e => `- ${e}`).join('\n')}

REQUIREMENTS:
1. Output ONLY valid JSON
2. No markdown, no prose, no explanations
3. Start with { and end with }
4. All keys must be double-quoted
5. No trailing commas

Attempt ${context.attemptNumber + 1}/3. Output the JSON now:`;
}

// ============================================================================
// MAIN ENFORCER FUNCTION
// ============================================================================

export interface EnforcerConfig {
  schema: SchemaDefinition;
  maxRetries: number;
  onRetry?: (context: RetryContext) => Promise<string>;
}

/**
 * Extract and validate JSON with retries
 * Returns null if all attempts fail (engine considered missing)
 */
export async function enforceSchema<T>(
  rawOutput: string,
  config: EnforcerConfig
): Promise<ExtractionResult<T>> {
  let retryCount = 0;
  let currentInput = rawOutput;
  const allErrors: string[] = [];
  
  while (retryCount <= config.maxRetries) {
    // Attempt extraction
    const { json, method } = extractJSON(currentInput);
    
    if (!json) {
      const error = `Failed to extract JSON (attempt ${retryCount + 1})`;
      allErrors.push(error);
      logger.warn('🔒 JSON extraction failed', { attempt: retryCount + 1, method });
      
      if (retryCount < config.maxRetries && config.onRetry) {
        const retryPrompt = buildRetryPrompt({
          originalPrompt: '',
          previousErrors: allErrors,
          attemptNumber: retryCount,
        });
        currentInput = await config.onRetry({
          originalPrompt: retryPrompt,
          previousErrors: allErrors,
          attemptNumber: retryCount,
        });
        retryCount++;
        continue;
      }
      
      return {
        success: false,
        data: null,
        rawInput: rawOutput,
        extractionMethod: method,
        validationErrors: allErrors,
        retryCount,
      };
    }
    
    // Parse JSON
    let parsed: any;
    try {
      parsed = JSON.parse(json);
    } catch (e: any) {
      allErrors.push(`JSON parse error: ${e.message}`);
      retryCount++;
      continue;
    }
    
    // Validate against schema
    const schemaErrors = validateAgainstSchema(parsed, config.schema);
    
    if (schemaErrors.length === 0) {
      logger.info('🔒 Schema validation passed', { method, retryCount });
      return {
        success: true,
        data: parsed as T,
        rawInput: rawOutput,
        extractionMethod: method,
        validationErrors: [],
        retryCount,
      };
    }
    
    // Schema validation failed
    allErrors.push(...schemaErrors);
    logger.warn('🔒 Schema validation failed', { errors: schemaErrors, attempt: retryCount + 1 });
    
    if (retryCount < config.maxRetries && config.onRetry) {
      const retryPrompt = buildRetryPrompt({
        originalPrompt: '',
        previousErrors: schemaErrors,
        attemptNumber: retryCount,
      });
      currentInput = await config.onRetry({
        originalPrompt: retryPrompt,
        previousErrors: schemaErrors,
        attemptNumber: retryCount,
      });
      retryCount++;
      continue;
    }
    
    // Max retries reached with validation errors
    return {
      success: false,
      data: null,
      rawInput: rawOutput,
      extractionMethod: method,
      validationErrors: allErrors,
      retryCount,
    };
  }
  
  // Should not reach here, but safety return
  return {
    success: false,
    data: null,
    rawInput: rawOutput,
    extractionMethod: 'direct_parse',
    validationErrors: allErrors,
    retryCount,
  };
}

// ============================================================================
// DRIVER/RISK ITEM VALIDATION
// ============================================================================

/**
 * Validate individual driver item structure
 */
export function validateDriverItem(driver: any): string[] {
  const errors: string[] = [];
  
  if (!driver.topic || typeof driver.topic !== 'string') {
    errors.push('Driver missing valid topic');
  }
  if (!driver.summary || typeof driver.summary !== 'string') {
    errors.push('Driver missing valid summary');
  }
  if (!Array.isArray(driver.evidence_keys)) {
    errors.push('Driver missing evidence_keys array');
  } else if (driver.evidence_keys.length === 0) {
    errors.push('Driver has empty evidence_keys (will be demoted to unknowns)');
  }
  if (!['high', 'medium', 'low'].includes(driver.confidence)) {
    errors.push(`Driver has invalid confidence: ${driver.confidence}`);
  }
  
  return errors;
}

/**
 * Validate individual risk item structure
 */
export function validateRiskItem(risk: any): string[] {
  const errors: string[] = [];
  
  if (!risk.risk || typeof risk.risk !== 'string') {
    errors.push('Risk missing valid risk field');
  }
  if (!risk.why || typeof risk.why !== 'string') {
    errors.push('Risk missing valid why field');
  }
  if (!Array.isArray(risk.evidence_keys)) {
    errors.push('Risk missing evidence_keys array');
  } else if (risk.evidence_keys.length === 0) {
    errors.push('Risk has empty evidence_keys (will be demoted to unknowns)');
  }
  if (!['high', 'medium', 'low'].includes(risk.confidence)) {
    errors.push(`Risk has invalid confidence: ${risk.confidence}`);
  }
  
  return errors;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  extractJSON as extractJSONStrict,
  validateAgainstSchema as validateSchema,
};
