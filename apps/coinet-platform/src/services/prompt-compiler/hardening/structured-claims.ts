/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     📋 STRUCTURED CLAIMS — NO REGEX GUESSING                                 ║
 * ║                                                                               ║
 * ║   Claims are EXPLICITLY declared, not inferred from text patterns.           ║
 * ║   Renderer outputs claims_used[], validator checks against evidence.         ║
 * ║                                                                               ║
 * ║   This is HOW you make it unbreakable.                                       ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Final hardening                                           ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../../utils/logger';
import type { EvidencePack } from '../research-engine';

// ============================================================================
// TYPES
// ============================================================================

export type ClaimType =
  | 'TOKEN_AGE'
  | 'HOLDER_CONCENTRATION'
  | 'SECURITY_STATUS'
  | 'LIQUIDITY_STATE'
  | 'CREATOR_ACTIVITY'
  | 'PRICE_CURRENT'
  | 'PRICE_CHANGE'
  | 'VOLUME_STATE'
  | 'SOCIAL_SENTIMENT'
  | 'NEWS_EVENT'
  | 'DERIVATIVE_POSITION'
  | 'MARKET_CAP'
  | 'TOKEN_SUPPLY'
  | 'CONTRACT_VERIFICATION'
  | 'WHALE_ACTIVITY';

export interface StructuredClaim {
  type: ClaimType;
  evidence_keys: string[];      // Must resolve to real paths
  value_used: string | number;  // The actual value from evidence
  timestamp: number;            // When this evidence was fetched
  confidence: 'high' | 'medium' | 'low';
}

export interface ClaimValidationRule {
  type: ClaimType;
  requiredPaths: string[][];    // Array of path alternatives (at least one must exist)
  valueExtractor: (evidence: any, path: string) => any;
  freshnessMaxSeconds: number;  // How stale can this claim be?
}

// ============================================================================
// CLAIM VALIDATION RULES
// ============================================================================

export const CLAIM_VALIDATION_RULES: ClaimValidationRule[] = [
  {
    type: 'TOKEN_AGE',
    requiredPaths: [
      ['evidence.dexscreener.data.pairCreatedAt'],
      ['evidence.dexscreener.data.pair.createdAt'],
      ['evidence.pumpfun.data.created_timestamp'],
      ['evidence.onchain.data.deploy_time'],
    ],
    valueExtractor: (evidence, path) => getNestedValue(evidence, path),
    freshnessMaxSeconds: 300, // 5 minutes
  },
  {
    type: 'HOLDER_CONCENTRATION',
    requiredPaths: [
      ['evidence.holders.data.top_holders'],
      ['evidence.holders.data.top10_percentage'],
      ['evidence.holders.data.concentration'],
    ],
    valueExtractor: (evidence, path) => getNestedValue(evidence, path),
    freshnessMaxSeconds: 600, // 10 minutes
  },
  {
    type: 'SECURITY_STATUS',
    requiredPaths: [
      ['evidence.security.data.risk_level'],
      ['evidence.security.data.is_honeypot'],
      ['evidence.security.data.flags'],
    ],
    valueExtractor: (evidence, path) => getNestedValue(evidence, path),
    freshnessMaxSeconds: 1800, // 30 minutes
  },
  {
    type: 'LIQUIDITY_STATE',
    requiredPaths: [
      ['evidence.dexscreener.data.liquidity'],
      ['evidence.dexscreener.data.liquidity.usd'],
    ],
    valueExtractor: (evidence, path) => getNestedValue(evidence, path),
    freshnessMaxSeconds: 90, // 90 seconds
  },
  {
    type: 'CREATOR_ACTIVITY',
    requiredPaths: [
      ['evidence.holders.data.creator_balance'],
      ['evidence.holders.data.deployer_holdings'],
      ['evidence.smartmoney.data.creator_activity'],
    ],
    valueExtractor: (evidence, path) => getNestedValue(evidence, path),
    freshnessMaxSeconds: 300, // 5 minutes
  },
  {
    type: 'PRICE_CURRENT',
    requiredPaths: [
      ['evidence.dexscreener.data.priceUsd'],
      ['evidence.dexscreener.data.price'],
    ],
    valueExtractor: (evidence, path) => getNestedValue(evidence, path),
    freshnessMaxSeconds: 60, // 1 minute
  },
  {
    type: 'PRICE_CHANGE',
    requiredPaths: [
      ['evidence.dexscreener.data.priceChange'],
      ['evidence.dexscreener.data.priceChange.h24'],
      ['evidence.dexscreener.data.priceChange.h1'],
    ],
    valueExtractor: (evidence, path) => getNestedValue(evidence, path),
    freshnessMaxSeconds: 60, // 1 minute
  },
  {
    type: 'VOLUME_STATE',
    requiredPaths: [
      ['evidence.dexscreener.data.volume'],
      ['evidence.dexscreener.data.volume.h24'],
    ],
    valueExtractor: (evidence, path) => getNestedValue(evidence, path),
    freshnessMaxSeconds: 90, // 90 seconds
  },
  {
    type: 'SOCIAL_SENTIMENT',
    requiredPaths: [
      ['evidence.sentiment.data.score'],
      ['evidence.sentiment.data.mentions'],
    ],
    valueExtractor: (evidence, path) => getNestedValue(evidence, path),
    freshnessMaxSeconds: 600, // 10 minutes
  },
  {
    type: 'NEWS_EVENT',
    requiredPaths: [
      ['evidence.news.data.items'],
      ['evidence.news.data.headlines'],
    ],
    valueExtractor: (evidence, path) => getNestedValue(evidence, path),
    freshnessMaxSeconds: 900, // 15 minutes
  },
  {
    type: 'DERIVATIVE_POSITION',
    requiredPaths: [
      ['evidence.derivatives.data.funding_rate'],
      ['evidence.derivatives.data.open_interest'],
    ],
    valueExtractor: (evidence, path) => getNestedValue(evidence, path),
    freshnessMaxSeconds: 120, // 2 minutes
  },
  {
    type: 'MARKET_CAP',
    requiredPaths: [
      ['evidence.dexscreener.data.fdv'],
      ['evidence.dexscreener.data.marketCap'],
    ],
    valueExtractor: (evidence, path) => getNestedValue(evidence, path),
    freshnessMaxSeconds: 90, // 90 seconds
  },
  {
    type: 'WHALE_ACTIVITY',
    requiredPaths: [
      ['evidence.smartmoney.data.whale_trades'],
      ['evidence.holders.data.whale_activity'],
    ],
    valueExtractor: (evidence, path) => getNestedValue(evidence, path),
    freshnessMaxSeconds: 300, // 5 minutes
  },
];

// ============================================================================
// UTILITIES
// ============================================================================

function getNestedValue(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  
  return current;
}

function getTimestamp(evidence: any, moduleName: string): number {
  const module = getNestedValue(evidence, `evidence.${moduleName}`);
  return module?.ts || 0;
}

// ============================================================================
// CLAIM VALIDATION
// ============================================================================

export interface ClaimValidationResult {
  valid: boolean;
  claim: StructuredClaim;
  issues: string[];
  isFresh: boolean;
  resolvedPath: string | null;
  actualValue: any;
}

/**
 * Validate a single structured claim against evidence
 */
export function validateClaim(
  claim: StructuredClaim,
  evidencePack: EvidencePack
): ClaimValidationResult {
  const issues: string[] = [];
  const rule = CLAIM_VALIDATION_RULES.find(r => r.type === claim.type);
  
  if (!rule) {
    return {
      valid: false,
      claim,
      issues: [`Unknown claim type: ${claim.type}`],
      isFresh: false,
      resolvedPath: null,
      actualValue: undefined,
    };
  }
  
  // Check if at least one required path exists
  let resolvedPath: string | null = null;
  let actualValue: any = undefined;
  
  for (const pathGroup of rule.requiredPaths) {
    for (const path of pathGroup) {
      const value = getNestedValue(evidencePack, path);
      if (value !== undefined && value !== null) {
        resolvedPath = path;
        actualValue = value;
        break;
      }
    }
    if (resolvedPath) break;
  }
  
  if (!resolvedPath) {
    issues.push(`No evidence found for claim type ${claim.type}. Required paths: ${rule.requiredPaths.flat().join(', ')}`);
  }
  
  // Check if claimed evidence_keys match what we found
  if (resolvedPath && !claim.evidence_keys.some(k => k === resolvedPath || resolvedPath!.includes(k))) {
    issues.push(`Claimed evidence_keys [${claim.evidence_keys.join(', ')}] don't include actual path ${resolvedPath}`);
  }
  
  // Check freshness
  const moduleName = resolvedPath?.split('.')[1] || '';
  const moduleTs = getTimestamp(evidencePack, moduleName);
  const ageSeconds = moduleTs > 0 ? (Date.now() - moduleTs) / 1000 : Infinity;
  const isFresh = ageSeconds <= rule.freshnessMaxSeconds;
  
  if (!isFresh && resolvedPath) {
    issues.push(`Claim ${claim.type} uses stale data (${Math.round(ageSeconds)}s old, max ${rule.freshnessMaxSeconds}s)`);
  }
  
  // Check if value_used matches actual value (within tolerance for numbers)
  if (actualValue !== undefined && claim.value_used !== undefined) {
    const valueMatches = checkValueMatch(claim.value_used, actualValue);
    if (!valueMatches) {
      issues.push(`Claimed value "${claim.value_used}" doesn't match evidence value "${actualValue}"`);
    }
  }
  
  return {
    valid: issues.length === 0,
    claim,
    issues,
    isFresh,
    resolvedPath,
    actualValue,
  };
}

function checkValueMatch(claimed: string | number, actual: any): boolean {
  if (typeof claimed === 'number' && typeof actual === 'number') {
    // Allow 5% tolerance for numbers
    const diff = Math.abs(claimed - actual);
    return diff < 1 || diff / actual < 0.05;
  }
  
  if (typeof claimed === 'string' && typeof actual === 'string') {
    return claimed.toLowerCase() === actual.toLowerCase();
  }
  
  // For objects/arrays, just check existence
  if (typeof actual === 'object') {
    return true;
  }
  
  return String(claimed) === String(actual);
}

/**
 * Validate all claims in a response
 */
export function validateAllClaims(
  claims: StructuredClaim[],
  evidencePack: EvidencePack
): {
  allValid: boolean;
  results: ClaimValidationResult[];
  invalidClaims: StructuredClaim[];
  staleClaims: StructuredClaim[];
} {
  const results = claims.map(claim => validateClaim(claim, evidencePack));
  
  const invalidClaims = results.filter(r => !r.valid).map(r => r.claim);
  const staleClaims = results.filter(r => !r.isFresh && r.valid).map(r => r.claim);
  
  if (invalidClaims.length > 0) {
    logger.warn('📋 Invalid claims detected', {
      count: invalidClaims.length,
      types: invalidClaims.map(c => c.type),
    });
  }
  
  return {
    allValid: invalidClaims.length === 0,
    results,
    invalidClaims,
    staleClaims,
  };
}

// ============================================================================
// CLAIM BUILDER (FOR PASS-1 OUTPUT)
// ============================================================================

/**
 * Build a structured claim from evidence
 */
export function buildClaim(
  type: ClaimType,
  evidencePack: EvidencePack
): StructuredClaim | null {
  const rule = CLAIM_VALIDATION_RULES.find(r => r.type === type);
  if (!rule) return null;
  
  // Find the first valid path
  for (const pathGroup of rule.requiredPaths) {
    for (const path of pathGroup) {
      const value = getNestedValue(evidencePack, path);
      if (value !== undefined && value !== null) {
        const moduleName = path.split('.')[1];
        const moduleTs = getTimestamp(evidencePack, moduleName);
        
        return {
          type,
          evidence_keys: [path],
          value_used: typeof value === 'object' ? JSON.stringify(value).substring(0, 100) : value,
          timestamp: moduleTs,
          confidence: 'high',
        };
      }
    }
  }
  
  return null;
}

/**
 * Extract all available claims from evidence
 */
export function extractAvailableClaims(evidencePack: EvidencePack): StructuredClaim[] {
  const claims: StructuredClaim[] = [];
  
  for (const rule of CLAIM_VALIDATION_RULES) {
    const claim = buildClaim(rule.type, evidencePack);
    if (claim) {
      claims.push(claim);
    }
  }
  
  return claims;
}

// ============================================================================
// CLAIM ALLOWLIST FOR RENDERER
// ============================================================================

/**
 * Generate the allowlist of claims the renderer can use
 * This goes into the renderer prompt to constrain what it can say
 */
export function generateClaimAllowlist(evidencePack: EvidencePack): {
  allowed: ClaimType[];
  forbidden: ClaimType[];
  claimContext: string;
} {
  const available = extractAvailableClaims(evidencePack);
  const allowed = available.map(c => c.type);
  
  const allTypes: ClaimType[] = CLAIM_VALIDATION_RULES.map(r => r.type);
  const forbidden = allTypes.filter(t => !allowed.includes(t));
  
  // Build human-readable context for the renderer
  const claimContext = `
[CLAIM ALLOWLIST]
You MAY make claims about: ${allowed.join(', ') || 'NONE'}
You MUST NOT make claims about: ${forbidden.join(', ')}

For each claim you make, you MUST include it in claims_used[] with:
- type: one of the allowed types
- evidence_keys: the exact path(s) you're referencing
- value_used: the exact value from evidence

If you cannot cite evidence, you cannot make the claim. Say "don't have that data" instead.
`;
  
  return { allowed, forbidden, claimContext };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  CLAIM_VALIDATION_RULES as STRUCTURED_CLAIM_RULES,
  getNestedValue as resolvePath,
};
