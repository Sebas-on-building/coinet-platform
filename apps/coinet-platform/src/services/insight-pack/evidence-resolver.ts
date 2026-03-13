/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔗 EVIDENCE RESOLVER — Bridge to Evidence Pack System                     ║
 * ║                                                                               ║
 * ║   Provides utility functions for the Insight Pack to interact with           ║
 * ║   Evidence Pack data structures.                                             ║
 * ║                                                                               ║
 * ║   @version 1.0.0                                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import {
  EvidencePack,
  EvidenceModules,
  CoverageMap,
  MODULE_TTL_SECONDS,
} from '../evidence-pack/types';

// ============================================================================
// TYPE EXPORTS (for insight-pack consumers)
// ============================================================================

export interface EvidenceResolution {
  found: boolean;
  /** @deprecated Use `found` instead */
  exists?: boolean;
  value: any;
  path: string;
  module?: string;
  /** Error message when path not found */
  error?: string;
}

export interface EvidenceKeyValidation {
  valid: boolean;
  invalidKeys: string[];
  missingModules: string[];
  suggestions: string[];
}

export interface ParsedEvidencePath {
  module: string;
  field: string;
  subpath: string[];
  arrayIndex?: number;
}

// ============================================================================
// MODULE EXTRACTION
// ============================================================================

/**
 * Get list of available (non-missing, non-error) modules from an Evidence Pack
 */
export function getAvailableModules(pack: EvidencePack): string[] {
  return pack.coverage.available;
}

/**
 * Get list of missing modules from an Evidence Pack
 */
export function getMissingModules(pack: EvidencePack): string[] {
  return pack.coverage.missing;
}

/**
 * Get list of stale modules from an Evidence Pack
 */
export function getStaleModules(pack: EvidencePack): string[] {
  return pack.coverage.stale;
}

/**
 * Get list of error modules from an Evidence Pack
 */
export function getErrorModules(pack: EvidencePack): string[] {
  return pack.coverage.errors;
}

// ============================================================================
// EVIDENCE KEY RESOLUTION
// ============================================================================

/**
 * Resolve an evidence key path to actual data
 * Example: "evidence.dexscreener.data.price_usd" -> actual value
 */
export function resolveEvidenceKey(
  pack: EvidencePack,
  keyPath: string
): { found: boolean; value: any } {
  // Key format: evidence.module.field[.subfield|[index]]
  if (!keyPath.startsWith('evidence.')) {
    return { found: false, value: undefined };
  }

  const parts = keyPath.slice(9).split('.');  // Remove "evidence." prefix
  if (parts.length < 2) {
    return { found: false, value: undefined };
  }

  const moduleName = parts[0];
  const moduleData = (pack.evidence as any)[moduleName];

  if (!moduleData || moduleData.status !== 'ok' || !moduleData.data) {
    return { found: false, value: undefined };
  }

  // Navigate the path
  let current = moduleData.data;
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    
    // Handle array indexing: field[0]
    const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const fieldName = arrayMatch[1];
      const index = parseInt(arrayMatch[2], 10);
      
      if (current[fieldName] === undefined || !Array.isArray(current[fieldName])) {
        return { found: false, value: undefined };
      }
      
      current = current[fieldName][index];
    } else {
      // Regular field access
      if (current[part] === undefined) {
        return { found: false, value: undefined };
      }
      current = current[part];
    }
  }

  return { found: true, value: current };
}

/**
 * Check if an evidence key exists and has valid data
 */
export function evidenceKeyExists(pack: EvidencePack, keyPath: string): boolean {
  const { found, value } = resolveEvidenceKey(pack, keyPath);
  return found && value !== null && value !== undefined;
}

/**
 * Get all valid evidence keys from a pack (for validation)
 */
export function getAllValidEvidenceKeys(pack: EvidencePack): string[] {
  const keys: string[] = [];

  const modules = ['dexscreener', 'security', 'holders', 'sentiment', 'news', 'derivatives', 'onchain', 'market_snapshot'];

  for (const moduleName of modules) {
    const moduleData = (pack.evidence as any)[moduleName];
    if (!moduleData || moduleData.status !== 'ok' || !moduleData.data) {
      continue;
    }

    // Add all top-level fields
    const data = moduleData.data;
    for (const field of Object.keys(data)) {
      if (data[field] !== null && data[field] !== undefined) {
        keys.push(`evidence.${moduleName}.data.${field}`);
        
        // Handle nested objects
        if (typeof data[field] === 'object' && !Array.isArray(data[field])) {
          for (const subfield of Object.keys(data[field])) {
            keys.push(`evidence.${moduleName}.data.${field}.${subfield}`);
          }
        }
        
        // Handle arrays
        if (Array.isArray(data[field])) {
          data[field].forEach((item: any, idx: number) => {
            keys.push(`evidence.${moduleName}.data.${field}[${idx}]`);
            if (typeof item === 'object') {
              for (const itemField of Object.keys(item)) {
                keys.push(`evidence.${moduleName}.data.${field}[${idx}].${itemField}`);
              }
            }
          });
        }
      }
    }
  }

  return keys;
}

// ============================================================================
// COVERAGE HELPERS
// ============================================================================

/**
 * Get quality score from Evidence Pack
 */
export function getQualityScore(pack: EvidencePack): number {
  return pack.coverage.quality_score;
}

/**
 * Check if time disclosure is required
 */
export function requiresTimeDisclosure(pack: EvidencePack): boolean {
  return pack.coverage.time_disclosure_required;
}

/**
 * Get freshness for a specific module
 */
export function getModuleFreshness(pack: EvidencePack, moduleName: string): number | null {
  return pack.coverage.freshness_seconds[moduleName] ?? null;
}

/**
 * Check if a module is fresh (within TTL)
 */
export function isModuleFresh(pack: EvidencePack, moduleName: string): boolean {
  const freshness = getModuleFreshness(pack, moduleName);
  if (freshness === null) return false;
  
  const ttl = MODULE_TTL_SECONDS[moduleName] || 300;
  return freshness <= ttl;
}

// ============================================================================
// TOKEN HELPERS
// ============================================================================

/**
 * Get the primary resolved token from Evidence Pack
 */
export function getPrimaryToken(pack: EvidencePack): {
  symbol: string;
  chain: string;
  address: string | null;
  confidence: number;
} | null {
  const resolved = pack.token_resolution.resolved;
  if (resolved.length === 0) return null;
  
  const token = resolved[0];
  return {
    symbol: token.symbol,
    chain: token.chain,
    address: token.address,
    confidence: token.confidence,
  };
}

/**
 * Check if token was user-confirmed
 */
export function isTokenConfirmed(pack: EvidencePack): boolean {
  const resolved = pack.token_resolution.resolved;
  if (resolved.length === 0) return false;
  return resolved[0].is_user_confirmed;
}

/**
 * Check if a clarifier is pending
 */
export function hasPendingClarifier(pack: EvidencePack): boolean {
  return pack.token_resolution.clarifier !== null;
}

/**
 * Get the pending clarifier question
 */
export function getClarifierQuestion(pack: EvidencePack): string | null {
  return pack.token_resolution.clarifier?.question ?? null;
}

// ============================================================================
// SUMMARY GENERATION
// ============================================================================

/**
 * Generate a brief coverage summary for prompts
 */
export function generateBriefSummary(pack: EvidencePack): string {
  const { coverage } = pack;
  const parts: string[] = [];

  if (coverage.available.length > 0) {
    parts.push(`Data: ${coverage.available.join(', ')}`);
  }

  if (coverage.missing.length > 0) {
    parts.push(`Missing: ${coverage.missing.join(', ')}`);
  }

  parts.push(`Quality: ${Math.round(coverage.quality_score * 100)}%`);

  if (coverage.time_disclosure_required) {
    parts.push('⚠️ Time mismatch');
  }

  return parts.join(' | ');
}

// ============================================================================
// ADDITIONAL EXPORTS FOR INSIGHT-PACK INDEX
// ============================================================================

/**
 * Alias for resolveEvidenceKey (used in index.ts)
 */
export function resolveEvidencePath(
  pack: EvidencePack,
  keyPath: string
): EvidenceResolution {
  const result = resolveEvidenceKey(pack, keyPath);
  return {
    found: result.found,
    exists: result.found,
    value: result.value,
    path: keyPath,
    module: keyPath.startsWith('evidence.') ? keyPath.split('.')[1] : undefined,
    error: result.found ? undefined : 'Path does not exist',
  };
}

/**
 * Parse an evidence key path into components
 */
export function parseEvidencePath(keyPath: string): ParsedEvidencePath | null {
  if (!keyPath.startsWith('evidence.')) {
    return null;
  }

  const parts = keyPath.slice(9).split('.');
  if (parts.length < 2) {
    return null;
  }

  const module = parts[0];
  const field = parts[1];
  const subpath = parts.slice(2);

  // Check for array index in the last part
  let arrayIndex: number | undefined;
  if (subpath.length > 0) {
    const lastPart = subpath[subpath.length - 1];
    const arrayMatch = lastPart.match(/\[(\d+)\]$/);
    if (arrayMatch) {
      arrayIndex = parseInt(arrayMatch[1], 10);
      subpath[subpath.length - 1] = lastPart.replace(/\[\d+\]$/, '');
    }
  }

  return {
    module,
    field,
    subpath,
    arrayIndex,
  };
}

/**
 * Validate multiple evidence keys
 */
export function validateEvidenceKeys(
  pack: EvidencePack,
  keys: string[]
): EvidenceKeyValidation {
  const invalidKeys: string[] = [];
  const missingModules = new Set<string>();
  const suggestions: string[] = [];

  for (const key of keys) {
    if (!evidenceKeyExists(pack, key)) {
      invalidKeys.push(key);

      const parsed = parseEvidencePath(key);
      if (parsed) {
        const moduleData = (pack.evidence as any)[parsed.module];
        if (!moduleData || moduleData.status !== 'ok') {
          missingModules.add(parsed.module);
        }
      }
    }
  }

  // Generate suggestions for invalid keys
  if (invalidKeys.length > 0) {
    const validKeys = getAllValidEvidenceKeys(pack);
    for (const invalid of invalidKeys.slice(0, 3)) {
      const parsed = parseEvidencePath(invalid);
      if (parsed) {
        const similar = validKeys.filter(k => k.includes(parsed.module));
        if (similar.length > 0) {
          suggestions.push(`Did you mean: ${similar[0]}?`);
        }
      }
    }
  }

  return {
    valid: invalidKeys.length === 0,
    invalidKeys,
    missingModules: [...missingModules],
    suggestions,
  };
}

/**
 * Get a specific module from the Evidence Pack
 */
export function getModuleFromPack(
  pack: EvidencePack,
  moduleName: string
): { status: string; data: any } | null {
  const moduleData = (pack.evidence as any)[moduleName];
  if (!moduleData) return null;
  
  return {
    status: moduleData.status,
    data: moduleData.data,
  };
}

/**
 * Check if a module is available in the Evidence Pack
 */
export function isModuleAvailable(pack: EvidencePack, moduleName: string): boolean {
  return pack.coverage.available.includes(moduleName);
}

/**
 * Suggest valid paths for a given module
 */
export function suggestPathsForModule(pack: EvidencePack, moduleName: string): string[] {
  const allKeys = getAllValidEvidenceKeys(pack);
  return allKeys.filter(k => k.startsWith(`evidence.${moduleName}.`)).slice(0, 10);
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  MODULE_TTL_SECONDS,
};
