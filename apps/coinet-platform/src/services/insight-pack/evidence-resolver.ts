/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔗 INSIGHT PACK — EVIDENCE KEY RESOLVER                                   ║
 * ║                                                                               ║
 * ║   Resolves evidence_keys paths against Evidence Pack.                         ║
 * ║   Ensures every claim references real data.                                   ║
 * ║                                                                               ║
 * ║   Path format: evidence.module.field.subfield or evidence.module.field[0]    ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Pass-1 Insight Pack Layer                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { EvidencePack } from '../evidence-pack/types';
import { logger } from '../../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface EvidenceResolution {
  exists: boolean;
  value: unknown;
  path: string;
  error?: string;
}

export interface EvidenceKeyValidation {
  valid: boolean;
  invalidKeys: Array<{
    path: string;
    reason: string;
  }>;
  validKeys: string[];
}

// ============================================================================
// PATH PARSER
// ============================================================================

/**
 * Parse an evidence key path into segments.
 * 
 * Examples:
 *   "evidence.dexscreener.data.price" → ["evidence", "dexscreener", "data", "price"]
 *   "evidence.security.data.flags[0].code" → ["evidence", "security", "data", "flags", 0, "code"]
 */
export function parseEvidencePath(path: string): (string | number)[] {
  const segments: (string | number)[] = [];
  
  // Must start with "evidence."
  if (!path.startsWith('evidence.')) {
    throw new Error(`Invalid path: must start with "evidence." - got "${path}"`);
  }
  
  // Remove the "evidence." prefix and parse the rest
  const rest = path.slice(9); // "evidence.".length = 9
  
  // Split by dots, but handle array brackets
  let current = '';
  let i = 0;
  
  while (i < rest.length) {
    const char = rest[i];
    
    if (char === '.') {
      if (current) {
        segments.push(current);
        current = '';
      }
    } else if (char === '[') {
      // Start of array index
      if (current) {
        segments.push(current);
        current = '';
      }
      // Find closing bracket
      const closeIndex = rest.indexOf(']', i);
      if (closeIndex === -1) {
        throw new Error(`Invalid path: unclosed bracket in "${path}"`);
      }
      const indexStr = rest.slice(i + 1, closeIndex);
      const index = parseInt(indexStr, 10);
      if (isNaN(index)) {
        throw new Error(`Invalid path: non-numeric array index "${indexStr}" in "${path}"`);
      }
      segments.push(index);
      i = closeIndex;
    } else {
      current += char;
    }
    
    i++;
  }
  
  // Don't forget the last segment
  if (current) {
    segments.push(current);
  }
  
  return segments;
}

// ============================================================================
// EVIDENCE PACK ACCESSOR
// ============================================================================

/**
 * Map module names to their location in Evidence Pack.
 */
function getModuleFromPack(pack: EvidencePack, moduleName: string): unknown {
  if (pack.kind === 'TOKEN') {
    const evidence = pack.evidence as Record<string, unknown>;
    return evidence[moduleName];
  }
  
  if (pack.kind === 'MARKET') {
    const evidence = pack.evidence as Record<string, unknown>;
    return evidence[moduleName];
  }
  
  if (pack.kind === 'BOTH') {
    // Check token first, then market
    const tokenEvidence = pack.token.evidence as Record<string, unknown>;
    if (tokenEvidence[moduleName]) {
      return tokenEvidence[moduleName];
    }
    const marketEvidence = pack.market.evidence as Record<string, unknown>;
    return marketEvidence[moduleName];
  }
  
  return undefined;
}

// ============================================================================
// RESOLVER
// ============================================================================

/**
 * Resolve an evidence key path against an Evidence Pack.
 * 
 * @param pack - The Evidence Pack to resolve against
 * @param path - The evidence key path (e.g., "evidence.dexscreener.data.price")
 * @returns Resolution result with exists flag and value
 */
export function resolveEvidencePath(pack: EvidencePack, path: string): EvidenceResolution {
  try {
    const segments = parseEvidencePath(path);
    
    if (segments.length < 2) {
      return {
        exists: false,
        value: undefined,
        path,
        error: 'Path too short: need at least module and field',
      };
    }
    
    // First segment is the module name
    const moduleName = segments[0] as string;
    const module = getModuleFromPack(pack, moduleName);
    
    if (!module) {
      return {
        exists: false,
        value: undefined,
        path,
        error: `Module "${moduleName}" not found in Evidence Pack`,
      };
    }
    
    // Navigate through the rest of the path
    let current: unknown = module;
    
    for (let i = 1; i < segments.length; i++) {
      const segment = segments[i];
      
      if (current === null || current === undefined) {
        return {
          exists: false,
          value: undefined,
          path,
          error: `Path segment "${segment}" cannot be accessed on null/undefined at index ${i}`,
        };
      }
      
      if (typeof segment === 'number') {
        // Array access
        if (!Array.isArray(current)) {
          return {
            exists: false,
            value: undefined,
            path,
            error: `Expected array at segment ${i} for index ${segment}, got ${typeof current}`,
          };
        }
        if (segment < 0 || segment >= current.length) {
          return {
            exists: false,
            value: undefined,
            path,
            error: `Array index ${segment} out of bounds (length: ${current.length})`,
          };
        }
        current = current[segment];
      } else {
        // Object property access
        if (typeof current !== 'object') {
          return {
            exists: false,
            value: undefined,
            path,
            error: `Expected object at segment ${i} for property "${segment}", got ${typeof current}`,
          };
        }
        const obj = current as Record<string, unknown>;
        if (!(segment in obj)) {
          return {
            exists: false,
            value: undefined,
            path,
            error: `Property "${segment}" not found in object`,
          };
        }
        current = obj[segment];
      }
    }
    
    return {
      exists: true,
      value: current,
      path,
    };
    
  } catch (error: any) {
    return {
      exists: false,
      value: undefined,
      path,
      error: error.message || 'Unknown error resolving path',
    };
  }
}

// ============================================================================
// BATCH VALIDATION
// ============================================================================

/**
 * Validate multiple evidence keys against an Evidence Pack.
 * 
 * @param pack - The Evidence Pack
 * @param keys - Array of evidence key paths
 * @returns Validation result with valid/invalid keys
 */
export function validateEvidenceKeys(
  pack: EvidencePack,
  keys: string[]
): EvidenceKeyValidation {
  const invalidKeys: Array<{ path: string; reason: string }> = [];
  const validKeys: string[] = [];
  
  for (const key of keys) {
    const resolution = resolveEvidencePath(pack, key);
    
    if (resolution.exists) {
      validKeys.push(key);
    } else {
      invalidKeys.push({
        path: key,
        reason: resolution.error || 'Path does not exist',
      });
    }
  }
  
  return {
    valid: invalidKeys.length === 0,
    invalidKeys,
    validKeys,
  };
}

// ============================================================================
// MODULE AVAILABILITY CHECK
// ============================================================================

/**
 * Get list of available module names from Evidence Pack.
 */
export function getAvailableModules(pack: EvidencePack): string[] {
  const modules: string[] = [];
  
  if (pack.kind === 'TOKEN') {
    for (const [name, module] of Object.entries(pack.evidence)) {
      if (module && (module as any).status === 'success') {
        modules.push(name);
      }
    }
  } else if (pack.kind === 'MARKET') {
    for (const [name, module] of Object.entries(pack.evidence)) {
      if (module && (module as any).status === 'success') {
        modules.push(name);
      }
    }
  } else if (pack.kind === 'BOTH') {
    for (const [name, module] of Object.entries(pack.token.evidence)) {
      if (module && (module as any).status === 'success') {
        modules.push(name);
      }
    }
    for (const [name, module] of Object.entries(pack.market.evidence)) {
      if (module && (module as any).status === 'success') {
        modules.push(name);
      }
    }
  }
  
  return modules;
}

/**
 * Check if an evidence key references an available module.
 */
export function isModuleAvailable(pack: EvidencePack, path: string): boolean {
  try {
    const segments = parseEvidencePath(path);
    if (segments.length < 1) return false;
    
    const moduleName = segments[0] as string;
    const availableModules = getAvailableModules(pack);
    
    return availableModules.includes(moduleName);
  } catch {
    return false;
  }
}

// ============================================================================
// PATH SUGGESTIONS
// ============================================================================

/**
 * Suggest valid evidence paths for a module.
 * Useful for error messages and debugging.
 */
export function suggestPathsForModule(pack: EvidencePack, moduleName: string): string[] {
  const module = getModuleFromPack(pack, moduleName);
  if (!module) return [];
  
  const paths: string[] = [];
  const prefix = `evidence.${moduleName}`;
  
  function traverse(obj: unknown, currentPath: string, depth: number): void {
    if (depth > 5) return; // Prevent infinite recursion
    
    if (obj === null || obj === undefined) return;
    
    if (Array.isArray(obj)) {
      if (obj.length > 0) {
        paths.push(`${currentPath}[0]`);
        traverse(obj[0], `${currentPath}[0]`, depth + 1);
      }
    } else if (typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        const newPath = `${currentPath}.${key}`;
        paths.push(newPath);
        traverse(value, newPath, depth + 1);
      }
    }
    // Primitives are leaf nodes, already added
  }
  
  traverse(module, prefix, 0);
  
  return paths.slice(0, 50); // Limit suggestions
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  parseEvidencePath,
  getModuleFromPack,
  getAvailableModules,
};
