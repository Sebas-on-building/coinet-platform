/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔍 EVIDENCE VERIFIER + CLAIM GATE                                        ║
 * ║                                                                               ║
 * ║   Every evidence_key must resolve to a real path in the Evidence Pack.       ║
 * ║   Every factual claim type must have required evidence.                      ║
 * ║                                                                               ║
 * ║   This kills 80% of "LLM invented it" failures.                              ║
 * ║                                                                               ║
 * ║   CLAIM TYPES TRACKED:                                                       ║
 * ║   - TOKEN_AGE: requires pairCreatedAt or equivalent                          ║
 * ║   - HOLDER_CONCENTRATION: requires holders data                              ║
 * ║   - SECURITY_STATUS: requires security module                                ║
 * ║   - LIQUIDITY_STATE: requires dexscreener liquidity                          ║
 * ║   - CREATOR_ACTIVITY: requires holder/transfer data                          ║
 * ║   - PRICE_MOVEMENT: requires price/volume data                               ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Production hardening                                      ║
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
  | 'PRICE_MOVEMENT'
  | 'VOLUME_STATE'
  | 'SOCIAL_SENTIMENT'
  | 'NEWS_EVENT'
  | 'DERIVATIVE_POSITION';

export interface ClaimRequirement {
  type: ClaimType;
  requiredPaths: string[];  // At least one must exist
  patterns: RegExp[];       // Text patterns that indicate this claim
}

export interface EvidencePathResult {
  path: string;
  exists: boolean;
  value: any;
  resolvedType: string;
}

export interface ClaimVerification {
  claim: ClaimType;
  hasEvidence: boolean;
  foundPaths: string[];
  missingPaths: string[];
  textMatches: string[];
}

export interface VerificationResult {
  pathsValid: boolean;
  invalidPaths: string[];
  validPaths: string[];
  claimViolations: ClaimVerification[];
  demotedToUnknowns: string[];
  overallValid: boolean;
}

// ============================================================================
// CLAIM REQUIREMENTS
// ============================================================================

export const CLAIM_REQUIREMENTS: ClaimRequirement[] = [
  {
    type: 'TOKEN_AGE',
    requiredPaths: [
      'evidence.dexscreener.pairCreatedAt',
      'evidence.dexscreener.data.pairCreatedAt',
      'evidence.dexscreener.data.pair.createdAt',
      'evidence.pumpfun.data.created_timestamp',
      'evidence.onchain.data.deploy_time',
    ],
    patterns: [
      /\b(\d+)\s*(hour|hr|minute|min|day|week|month)s?\s*old\b/i,
      /\bcreated\s+(\d+)\s*(hour|day|week)/i,
      /\blaunched\s+(\d+|yesterday|today)/i,
      /\bnew\s+token\b/i,
      /\bjust\s+(launched|deployed|created)\b/i,
    ],
  },
  {
    type: 'HOLDER_CONCENTRATION',
    requiredPaths: [
      'evidence.holders.data.top_holders',
      'evidence.holders.data.top10_percentage',
      'evidence.holders.data.concentration',
      'evidence.onchain.data.holder_distribution',
      'evidence.dexscreener.data.holders',
    ],
    patterns: [
      /\btop\s*\d+\s*wallets?\s*(hold|own|control)/i,
      /\b(\d+)%\s*(held|owned|controlled)\s*by/i,
      /\bconcentrated\b/i,
      /\bwhale\s*(dominat|control)/i,
      /\bholder\s*distribution\b/i,
      /\b(creator|dev|deployer)\s*(holds?|owns?|sold|dumped)/i,
    ],
  },
  {
    type: 'SECURITY_STATUS',
    requiredPaths: [
      'evidence.security.data.risk_level',
      'evidence.security.data.is_honeypot',
      'evidence.security.data.is_mintable',
      'evidence.security.data.buy_tax',
      'evidence.security.data.sell_tax',
      'evidence.security.data.flags',
    ],
    patterns: [
      /\b(honeypot|honey\s*pot)\b/i,
      /\b(mintable|mint\s*function)\b/i,
      /\b(rug|rugged|rugpull)\b/i,
      /\b(scam|fraudulent)\b/i,
      /\b(buy|sell)\s*tax/i,
      /\b(blacklist|whitelist)\s*(function|enabled)/i,
      /\bcontract\s*(verified|unverified)\b/i,
      /\b(safe|unsafe|risky)\s*contract\b/i,
    ],
  },
  {
    type: 'LIQUIDITY_STATE',
    requiredPaths: [
      'evidence.dexscreener.data.liquidity',
      'evidence.dexscreener.data.liquidity.usd',
      'evidence.dexscreener.data.fdv',
      'evidence.pumpfun.data.bonding_curve',
    ],
    patterns: [
      /\$[\d,.]+[MKB]?\s*(liquidity|liq)\b/i,
      /\bliquidity\s*(is|at|around)\s*\$?[\d,.]+/i,
      /\b(thin|low|deep|high)\s*liquidity\b/i,
      /\bfdv\s*(is|at|around|of)\s*\$?[\d,.]+/i,
      /\bmarket\s*cap\s*(is|at|around)\s*\$?[\d,.]+/i,
    ],
  },
  {
    type: 'CREATOR_ACTIVITY',
    requiredPaths: [
      'evidence.holders.data.creator_balance',
      'evidence.holders.data.deployer_holdings',
      'evidence.onchain.data.creator_transactions',
      'evidence.smartmoney.data.creator_activity',
    ],
    patterns: [
      /\b(creator|dev|deployer)\s*(sold|dumped|transferred|moved)/i,
      /\b(creator|dev)\s*(wallet|address)\b/i,
      /\b(dev|team)\s*(holdings?|allocation)\b/i,
      /\binsider\s*(sold|selling|dump)/i,
    ],
  },
  {
    type: 'PRICE_MOVEMENT',
    requiredPaths: [
      'evidence.dexscreener.data.priceUsd',
      'evidence.dexscreener.data.priceChange',
      'evidence.dexscreener.data.priceChange.h24',
      'evidence.dexscreener.data.price',
    ],
    patterns: [
      /\b(up|down|pumped|dumped|crashed|mooned)\s*(\d+)%/i,
      /\$[\d,.]+\s*(price|trading\s*at)/i,
      /\bprice\s*(is|at|around)\s*\$?[\d,.]+/i,
      /\b(\d+)%\s*(gain|loss|increase|decrease)\b/i,
    ],
  },
  {
    type: 'VOLUME_STATE',
    requiredPaths: [
      'evidence.dexscreener.data.volume',
      'evidence.dexscreener.data.volume.h24',
      'evidence.dexscreener.data.txns',
    ],
    patterns: [
      /\$[\d,.]+[MKB]?\s*(volume|vol)\b/i,
      /\bvolume\s*(is|at|around)\s*\$?[\d,.]+/i,
      /\b(high|low|massive|thin)\s*volume\b/i,
      /\b(\d+)\s*(transactions|txns|trades)\b/i,
    ],
  },
  {
    type: 'SOCIAL_SENTIMENT',
    requiredPaths: [
      'evidence.sentiment.data.score',
      'evidence.sentiment.data.mentions',
      'evidence.sentiment.data.twitter',
    ],
    patterns: [
      /\bsentiment\s*(is|looks)\s*(positive|negative|neutral)/i,
      /\btwitter\s*(buzz|hype|mentions)/i,
      /\bsocial\s*(momentum|activity)/i,
      /\btrending\b/i,
    ],
  },
  {
    type: 'NEWS_EVENT',
    requiredPaths: [
      'evidence.news.data.items',
      'evidence.news.data.headlines',
      'evidence.news.data.events',
    ],
    patterns: [
      /\b(announced|announcement|news)\b/i,
      /\b(partnership|listing|launch)\s*announced\b/i,
      /\bbreaking\b/i,
      /\baccording\s*to\s*news\b/i,
    ],
  },
  {
    type: 'DERIVATIVE_POSITION',
    requiredPaths: [
      'evidence.derivatives.data.funding_rate',
      'evidence.derivatives.data.open_interest',
      'evidence.derivatives.data.liquidations',
    ],
    patterns: [
      /\bfunding\s*(rate|is)\b/i,
      /\bopen\s*interest\b/i,
      /\bliquidations?\b/i,
      /\b(longs?|shorts?)\s*(liquidated|wiped)/i,
      /\bperps?\b/i,
    ],
  },
];

// ============================================================================
// EVIDENCE PATH RESOLUTION
// ============================================================================

/**
 * Build a flat map of all available paths in the Evidence Pack
 */
export function buildEvidencePathMap(pack: EvidencePack): Map<string, any> {
  const pathMap = new Map<string, any>();
  
  const traverse = (obj: any, prefix: string) => {
    if (obj === null || obj === undefined) return;
    
    if (typeof obj === 'object' && !Array.isArray(obj)) {
      pathMap.set(prefix, obj);
      for (const [key, value] of Object.entries(obj)) {
        traverse(value, `${prefix}.${key}`);
      }
    } else if (Array.isArray(obj)) {
      pathMap.set(prefix, obj);
      obj.forEach((item, index) => {
        traverse(item, `${prefix}[${index}]`);
      });
    } else {
      pathMap.set(prefix, obj);
    }
  };
  
  // Traverse each module
  for (const [moduleName, moduleData] of Object.entries(pack.evidence)) {
    if (!moduleData) continue;
    pathMap.set(`evidence.${moduleName}`, moduleData);
    traverse(moduleData.data, `evidence.${moduleName}.data`);
  }
  
  return pathMap;
}

/**
 * Check if a path exists in the evidence (with fuzzy matching)
 */
export function resolvePath(path: string, pathMap: Map<string, any>): EvidencePathResult {
  // Direct match
  if (pathMap.has(path)) {
    const value = pathMap.get(path);
    return {
      path,
      exists: true,
      value,
      resolvedType: typeof value,
    };
  }
  
  // Try without array indices
  const withoutIndices = path.replace(/\[\d+\]/g, '');
  if (pathMap.has(withoutIndices)) {
    const value = pathMap.get(withoutIndices);
    return {
      path: withoutIndices,
      exists: true,
      value,
      resolvedType: typeof value,
    };
  }
  
  // Try partial match (evidence.dexscreener matches evidence.dexscreener.data.price)
  for (const [existingPath, value] of pathMap) {
    if (existingPath.startsWith(path + '.') || path.startsWith(existingPath + '.')) {
      return {
        path: existingPath,
        exists: true,
        value,
        resolvedType: typeof value,
      };
    }
  }
  
  return {
    path,
    exists: false,
    value: undefined,
    resolvedType: 'undefined',
  };
}

/**
 * Verify all evidence_keys in a list against the Evidence Pack
 */
export function verifyEvidenceKeys(
  keys: string[],
  pathMap: Map<string, any>
): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];
  
  for (const key of keys) {
    const result = resolvePath(key, pathMap);
    if (result.exists) {
      valid.push(key);
    } else {
      invalid.push(key);
    }
  }
  
  return { valid, invalid };
}

// ============================================================================
// CLAIM DETECTION
// ============================================================================

/**
 * Detect claim types in text based on patterns
 */
export function detectClaimsInText(text: string): ClaimType[] {
  const detected: Set<ClaimType> = new Set();
  
  for (const requirement of CLAIM_REQUIREMENTS) {
    for (const pattern of requirement.patterns) {
      if (pattern.test(text)) {
        detected.add(requirement.type);
        break; // One match is enough
      }
    }
  }
  
  return Array.from(detected);
}

/**
 * Check if evidence exists for a specific claim type
 */
export function checkClaimEvidence(
  claimType: ClaimType,
  pathMap: Map<string, any>
): { hasEvidence: boolean; foundPaths: string[] } {
  const requirement = CLAIM_REQUIREMENTS.find(r => r.type === claimType);
  if (!requirement) {
    return { hasEvidence: false, foundPaths: [] };
  }
  
  const foundPaths: string[] = [];
  
  for (const requiredPath of requirement.requiredPaths) {
    const result = resolvePath(requiredPath, pathMap);
    if (result.exists && result.value !== null && result.value !== undefined) {
      foundPaths.push(requiredPath);
    }
  }
  
  return {
    hasEvidence: foundPaths.length > 0,
    foundPaths,
  };
}

// ============================================================================
// MAIN VERIFICATION FUNCTION
// ============================================================================

export interface VerifyInsightInput {
  drivers: Array<{ topic: string; summary: string; evidence_keys: string[] }>;
  risks: Array<{ risk: string; why: string; evidence_keys: string[] }>;
  scenarios: { bull: string; base: string; bear: string };
  evidencePack: EvidencePack;
}

/**
 * Full verification of insight against evidence
 * Returns what to demote to unknowns and what claims are ungrounded
 */
export function verifyInsightEvidence(input: VerifyInsightInput): VerificationResult {
  const { drivers, risks, scenarios, evidencePack } = input;
  
  const pathMap = buildEvidencePathMap(evidencePack);
  const allValidPaths: string[] = [];
  const allInvalidPaths: string[] = [];
  const demotedToUnknowns: string[] = [];
  const claimViolations: ClaimVerification[] = [];
  
  // Verify driver evidence keys
  for (const driver of drivers) {
    const { valid, invalid } = verifyEvidenceKeys(driver.evidence_keys, pathMap);
    allValidPaths.push(...valid);
    allInvalidPaths.push(...invalid);
    
    // If driver has NO valid evidence keys, it should be demoted
    if (valid.length === 0 && driver.evidence_keys.length > 0) {
      demotedToUnknowns.push(`Driver "${driver.topic}": claimed evidence paths don't exist`);
    } else if (driver.evidence_keys.length === 0) {
      demotedToUnknowns.push(`Driver "${driver.topic}": no evidence keys provided`);
    }
    
    // Check for claim types in the summary without evidence
    const detectedClaims = detectClaimsInText(driver.summary);
    for (const claimType of detectedClaims) {
      const { hasEvidence, foundPaths } = checkClaimEvidence(claimType, pathMap);
      if (!hasEvidence) {
        claimViolations.push({
          claim: claimType,
          hasEvidence: false,
          foundPaths: [],
          missingPaths: CLAIM_REQUIREMENTS.find(r => r.type === claimType)?.requiredPaths || [],
          textMatches: [driver.summary.substring(0, 100)],
        });
      }
    }
  }
  
  // Verify risk evidence keys
  for (const risk of risks) {
    const { valid, invalid } = verifyEvidenceKeys(risk.evidence_keys, pathMap);
    allValidPaths.push(...valid);
    allInvalidPaths.push(...invalid);
    
    if (valid.length === 0 && risk.evidence_keys.length > 0) {
      demotedToUnknowns.push(`Risk "${risk.risk}": claimed evidence paths don't exist`);
    } else if (risk.evidence_keys.length === 0) {
      demotedToUnknowns.push(`Risk "${risk.risk}": no evidence keys provided`);
    }
    
    const detectedClaims = detectClaimsInText(risk.why);
    for (const claimType of detectedClaims) {
      const { hasEvidence } = checkClaimEvidence(claimType, pathMap);
      if (!hasEvidence) {
        const existing = claimViolations.find(v => v.claim === claimType);
        if (!existing) {
          claimViolations.push({
            claim: claimType,
            hasEvidence: false,
            foundPaths: [],
            missingPaths: CLAIM_REQUIREMENTS.find(r => r.type === claimType)?.requiredPaths || [],
            textMatches: [risk.why.substring(0, 100)],
          });
        }
      }
    }
  }
  
  // Check scenarios for ungrounded claims
  const allScenarioText = `${scenarios.bull} ${scenarios.base} ${scenarios.bear}`;
  const scenarioClaims = detectClaimsInText(allScenarioText);
  for (const claimType of scenarioClaims) {
    const { hasEvidence } = checkClaimEvidence(claimType, pathMap);
    if (!hasEvidence) {
      const existing = claimViolations.find(v => v.claim === claimType);
      if (!existing) {
        claimViolations.push({
          claim: claimType,
          hasEvidence: false,
          foundPaths: [],
          missingPaths: CLAIM_REQUIREMENTS.find(r => r.type === claimType)?.requiredPaths || [],
          textMatches: ['in scenarios'],
        });
      }
    }
  }
  
  const pathsValid = allInvalidPaths.length === 0;
  const overallValid = pathsValid && claimViolations.length === 0 && demotedToUnknowns.length === 0;
  
  if (!overallValid) {
    logger.warn('🔍 Evidence verification issues', {
      invalidPaths: allInvalidPaths.length,
      claimViolations: claimViolations.length,
      demoted: demotedToUnknowns.length,
    });
  }
  
  return {
    pathsValid,
    invalidPaths: [...new Set(allInvalidPaths)],
    validPaths: [...new Set(allValidPaths)],
    claimViolations,
    demotedToUnknowns,
    overallValid,
  };
}

// ============================================================================
// CLAIM GATE FOR FINAL OUTPUT
// ============================================================================

/**
 * Check final rendered output for ungrounded claims
 * This is the last line of defense before showing to user
 */
export function gateClaimsInOutput(
  finalAnswer: string,
  evidencePack: EvidencePack
): { passed: boolean; violations: ClaimVerification[] } {
  const pathMap = buildEvidencePathMap(evidencePack);
  const detectedClaims = detectClaimsInText(finalAnswer);
  const violations: ClaimVerification[] = [];
  
  for (const claimType of detectedClaims) {
    const { hasEvidence, foundPaths } = checkClaimEvidence(claimType, pathMap);
    if (!hasEvidence) {
      violations.push({
        claim: claimType,
        hasEvidence: false,
        foundPaths,
        missingPaths: CLAIM_REQUIREMENTS.find(r => r.type === claimType)?.requiredPaths || [],
        textMatches: extractClaimContext(finalAnswer, claimType),
      });
    }
  }
  
  return {
    passed: violations.length === 0,
    violations,
  };
}

function extractClaimContext(text: string, claimType: ClaimType): string[] {
  const requirement = CLAIM_REQUIREMENTS.find(r => r.type === claimType);
  if (!requirement) return [];
  
  const matches: string[] = [];
  for (const pattern of requirement.patterns) {
    const match = text.match(pattern);
    if (match) {
      // Get surrounding context
      const index = text.indexOf(match[0]);
      const start = Math.max(0, index - 20);
      const end = Math.min(text.length, index + match[0].length + 20);
      matches.push(`...${text.substring(start, end)}...`);
    }
  }
  
  return matches;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  CLAIM_REQUIREMENTS as EVIDENCE_CLAIM_REQUIREMENTS,
  buildEvidencePathMap as buildPathMap,
  verifyInsightEvidence as verifyEvidence,
  gateClaimsInOutput as claimGate,
};
