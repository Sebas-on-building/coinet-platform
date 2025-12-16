/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🛡️ OMNISCORE LEGITIMACY GATE - SCAM FILTER                               ║
 * ║                                                                               ║
 * ║   The first line of defense: Is this project REAL?                           ║
 * ║                                                                               ║
 * ║   Output: LEGIT | WATCH | NOT_LEGIT | INSUFFICIENT_DATA                       ║
 * ║                                                                               ║
 * ║   Rule: If NOT_LEGIT or INSUFFICIENT_DATA → No confident score               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../utils/logger';
import type { CapBucket } from './omniscore-v2.5';

// ═══════════════════════════════════════════════════════════════════════════════
// LEGITIMACY STATUS
// ═══════════════════════════════════════════════════════════════════════════════

export type LegitimacyStatus = 'LEGIT' | 'WATCH' | 'NOT_LEGIT' | 'INSUFFICIENT_DATA';

export interface LegitimacyResult {
  status: LegitimacyStatus;
  confidence: number;          // 0-100, how confident we are in this assessment
  
  // Breakdown of checks
  checks: {
    identity: LegitimacyCheck;
    marketIntegrity: LegitimacyCheck;
    supplyIntegrity: LegitimacyCheck;
    protocolSafety: LegitimacyCheck;
    dataIntegrity: LegitimacyCheck;
  };
  
  // Summary
  passedChecks: number;
  totalChecks: number;
  failedReasons: string[];
  watchReasons: string[];
  
  // Caps/restrictions if WATCH
  posCap?: number;             // Maximum POS allowed if WATCH
  osCap?: number;              // Maximum OS allowed if WATCH
}

export interface LegitimacyCheck {
  name: string;
  passed: boolean;
  score: number;               // 0-100
  weight: number;              // Importance weight
  issues: string[];
  dataAvailable: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGITIMACY THRESHOLDS
// ═══════════════════════════════════════════════════════════════════════════════

const LEGITIMACY_CONFIG = {
  // Thresholds for status determination
  LEGIT_THRESHOLD: 75,         // Score >= 75 = LEGIT
  WATCH_THRESHOLD: 50,         // Score >= 50 = WATCH
  // Below 50 = NOT_LEGIT
  
  // Minimum data coverage for assessment
  MIN_DATA_COVERAGE: 0.4,      // Need 40% of checks to have data
  
  // Individual check weights
  WEIGHTS: {
    identity: 0.25,            // Is this the right token/project?
    marketIntegrity: 0.25,     // Is liquidity real?
    supplyIntegrity: 0.20,     // Is token distribution fair?
    protocolSafety: 0.15,      // Has it been hacked/rugged?
    dataIntegrity: 0.15,       // Do we have reliable data?
  },
  
  // Caps for WATCH status
  WATCH_POS_CAP: 75,           // Max POS for WATCH projects
  WATCH_OS_CAP: 70,            // Max OS for WATCH projects
};

// ═══════════════════════════════════════════════════════════════════════════════
// KNOWN LEGITIMATE PROJECTS (bypass checks)
// These have overwhelming evidence of legitimacy
// ═══════════════════════════════════════════════════════════════════════════════

const KNOWN_LEGIT_PROJECTS = new Set([
  'bitcoin', 'btc',
  'ethereum', 'eth',
  'solana', 'sol',
  'bnb', 'binancecoin',
  'cardano', 'ada',
  'avalanche', 'avax',
  'polygon', 'matic',
  'polkadot', 'dot',
  'chainlink', 'link',
  'uniswap', 'uni',
  'aave',
  'maker', 'mkr',
  'compound', 'comp',
  'curve', 'crv',
  'arbitrum', 'arb',
  'optimism', 'op',
  'cosmos', 'atom',
  'near',
  'sui',
  'aptos', 'apt',
  'lido', 'ldo',
  'toncoin', 'ton',
  'tron', 'trx',
  'litecoin', 'ltc',
  'dogecoin', 'doge',
  'shiba-inu', 'shib',
  'ripple', 'xrp',
]);

// ═══════════════════════════════════════════════════════════════════════════════
// LEGITIMACY CHECK FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface LegitimacyInputs {
  projectId: string;
  capBucket: CapBucket;
  marketCapUsd?: number;
  
  // Identity
  hasVerifiedContract?: boolean;
  hasOfficialSocials?: boolean;
  listedOnMajorExchanges?: boolean;
  coinGeckoVerified?: boolean;
  
  // Market integrity
  liquidityDepthUsd?: number;
  bidAskSpread?: number;
  washTradingScore?: number;       // 0-100, higher = more suspicious
  volumeToMcapRatio?: number;
  
  // Supply integrity
  topHoldersConcentration?: number; // 0-100, % held by top 10
  hasUnlockCliff?: boolean;
  unlockCliffDays?: number;
  insiderPercentage?: number;       // 0-100
  
  // Protocol safety
  hasBeenExploited?: boolean;
  exploitCount?: number;
  lastExploitDaysAgo?: number;
  hasAdminKeys?: boolean;
  isUpgradeable?: boolean;
  hasMultiSig?: boolean;
  
  // Data integrity
  dataCoverageQS?: number;          // 0-1
  dataCoverageOS?: number;          // 0-1
  sourceCount?: number;
  dataFreshness?: number;           // 0-1
}

/**
 * Check identity legitimacy
 */
function checkIdentity(inputs: LegitimacyInputs): LegitimacyCheck {
  const issues: string[] = [];
  let score = 50; // Start neutral
  
  const hasData = 
    inputs.hasVerifiedContract !== undefined ||
    inputs.coinGeckoVerified !== undefined ||
    inputs.listedOnMajorExchanges !== undefined;
  
  if (!hasData) {
    return {
      name: 'Identity Verification',
      passed: false,
      score: 0,
      weight: LEGITIMACY_CONFIG.WEIGHTS.identity,
      issues: ['No identity data available'],
      dataAvailable: false,
    };
  }
  
  // Verified contract
  if (inputs.hasVerifiedContract === true) {
    score += 20;
  } else if (inputs.hasVerifiedContract === false) {
    score -= 20;
    issues.push('Contract not verified');
  }
  
  // CoinGecko verified
  if (inputs.coinGeckoVerified === true) {
    score += 15;
  }
  
  // Listed on major exchanges
  if (inputs.listedOnMajorExchanges === true) {
    score += 15;
  } else if (inputs.listedOnMajorExchanges === false) {
    score -= 10;
    issues.push('Not listed on major exchanges');
  }
  
  // Official socials
  if (inputs.hasOfficialSocials === true) {
    score += 10;
  }
  
  return {
    name: 'Identity Verification',
    passed: score >= 60,
    score: Math.max(0, Math.min(100, score)),
    weight: LEGITIMACY_CONFIG.WEIGHTS.identity,
    issues,
    dataAvailable: true,
  };
}

/**
 * Check market integrity
 */
function checkMarketIntegrity(inputs: LegitimacyInputs): LegitimacyCheck {
  const issues: string[] = [];
  let score = 50;
  
  const hasData = 
    inputs.liquidityDepthUsd !== undefined ||
    inputs.washTradingScore !== undefined ||
    inputs.bidAskSpread !== undefined;
  
  if (!hasData) {
    return {
      name: 'Market Integrity',
      passed: false,
      score: 0,
      weight: LEGITIMACY_CONFIG.WEIGHTS.marketIntegrity,
      issues: ['No market data available'],
      dataAvailable: false,
    };
  }
  
  // Liquidity depth
  if (inputs.liquidityDepthUsd !== undefined) {
    if (inputs.liquidityDepthUsd >= 10_000_000) {
      score += 25;
    } else if (inputs.liquidityDepthUsd >= 1_000_000) {
      score += 15;
    } else if (inputs.liquidityDepthUsd >= 100_000) {
      score += 5;
    } else {
      score -= 15;
      issues.push('Very thin liquidity');
    }
  }
  
  // Wash trading detection
  if (inputs.washTradingScore !== undefined) {
    if (inputs.washTradingScore < 20) {
      score += 20;
    } else if (inputs.washTradingScore < 40) {
      score += 10;
    } else if (inputs.washTradingScore >= 70) {
      score -= 30;
      issues.push('High wash trading signals');
    }
  }
  
  // Bid-ask spread
  if (inputs.bidAskSpread !== undefined) {
    if (inputs.bidAskSpread < 0.1) {
      score += 10;
    } else if (inputs.bidAskSpread > 1) {
      score -= 15;
      issues.push('Wide bid-ask spread (>1%)');
    }
  }
  
  return {
    name: 'Market Integrity',
    passed: score >= 55,
    score: Math.max(0, Math.min(100, score)),
    weight: LEGITIMACY_CONFIG.WEIGHTS.marketIntegrity,
    issues,
    dataAvailable: true,
  };
}

/**
 * Check supply integrity
 */
function checkSupplyIntegrity(inputs: LegitimacyInputs): LegitimacyCheck {
  const issues: string[] = [];
  let score = 60; // Start slightly positive
  
  const hasData = 
    inputs.topHoldersConcentration !== undefined ||
    inputs.insiderPercentage !== undefined ||
    inputs.hasUnlockCliff !== undefined;
  
  if (!hasData) {
    return {
      name: 'Supply Integrity',
      passed: true, // Don't fail for missing data
      score: 50,
      weight: LEGITIMACY_CONFIG.WEIGHTS.supplyIntegrity,
      issues: ['Limited supply data available'],
      dataAvailable: false,
    };
  }
  
  // Top holders concentration
  if (inputs.topHoldersConcentration !== undefined) {
    if (inputs.topHoldersConcentration < 30) {
      score += 20;
    } else if (inputs.topHoldersConcentration < 50) {
      score += 10;
    } else if (inputs.topHoldersConcentration >= 80) {
      score -= 25;
      issues.push('Extremely concentrated holdings (>80%)');
    } else if (inputs.topHoldersConcentration >= 60) {
      score -= 10;
      issues.push('Concentrated holdings (>60%)');
    }
  }
  
  // Insider percentage
  if (inputs.insiderPercentage !== undefined) {
    if (inputs.insiderPercentage < 20) {
      score += 10;
    } else if (inputs.insiderPercentage >= 50) {
      score -= 20;
      issues.push('High insider allocation (>50%)');
    }
  }
  
  // Unlock cliff risk
  if (inputs.hasUnlockCliff && inputs.unlockCliffDays !== undefined) {
    if (inputs.unlockCliffDays < 30) {
      score -= 15;
      issues.push('Major unlock cliff approaching (<30 days)');
    }
  }
  
  return {
    name: 'Supply Integrity',
    passed: score >= 50,
    score: Math.max(0, Math.min(100, score)),
    weight: LEGITIMACY_CONFIG.WEIGHTS.supplyIntegrity,
    issues,
    dataAvailable: true,
  };
}

/**
 * Check protocol safety
 */
function checkProtocolSafety(inputs: LegitimacyInputs): LegitimacyCheck {
  const issues: string[] = [];
  let score = 70; // Start positive (assume safe until proven otherwise)
  
  const hasData = 
    inputs.hasBeenExploited !== undefined ||
    inputs.hasAdminKeys !== undefined ||
    inputs.hasMultiSig !== undefined;
  
  if (!hasData) {
    return {
      name: 'Protocol Safety',
      passed: true,
      score: 60,
      weight: LEGITIMACY_CONFIG.WEIGHTS.protocolSafety,
      issues: ['Limited protocol safety data'],
      dataAvailable: false,
    };
  }
  
  // Exploit history
  if (inputs.hasBeenExploited === true) {
    const exploitCount = inputs.exploitCount ?? 1;
    const daysSinceExploit = inputs.lastExploitDaysAgo ?? 0;
    
    if (daysSinceExploit < 30) {
      score -= 40;
      issues.push('Recent exploit (<30 days ago)');
    } else if (daysSinceExploit < 180) {
      score -= 25;
      issues.push('Exploit in last 6 months');
    } else {
      score -= 10 * exploitCount;
      issues.push(`${exploitCount} historical exploit(s)`);
    }
  } else if (inputs.hasBeenExploited === false) {
    score += 15; // Clean record bonus
  }
  
  // Admin key risk
  if (inputs.hasAdminKeys === true && inputs.hasMultiSig === false) {
    score -= 15;
    issues.push('Admin keys without multi-sig');
  }
  
  // Upgradeable contracts
  if (inputs.isUpgradeable === true) {
    if (inputs.hasMultiSig === true) {
      score -= 5; // Minor concern if multi-sig
    } else {
      score -= 15;
      issues.push('Upgradeable without multi-sig');
    }
  }
  
  return {
    name: 'Protocol Safety',
    passed: score >= 50,
    score: Math.max(0, Math.min(100, score)),
    weight: LEGITIMACY_CONFIG.WEIGHTS.protocolSafety,
    issues,
    dataAvailable: true,
  };
}

/**
 * Check data integrity
 */
function checkDataIntegrity(inputs: LegitimacyInputs): LegitimacyCheck {
  const issues: string[] = [];
  let score = 50;
  
  const coverageQS = inputs.dataCoverageQS ?? 0;
  const coverageOS = inputs.dataCoverageOS ?? 0;
  const avgCoverage = (coverageQS + coverageOS) / 2;
  
  // Coverage scoring
  if (avgCoverage >= 0.8) {
    score += 30;
  } else if (avgCoverage >= 0.6) {
    score += 20;
  } else if (avgCoverage >= 0.4) {
    score += 10;
  } else if (avgCoverage < 0.3) {
    score -= 20;
    issues.push('Very low data coverage (<30%)');
  }
  
  // Source count
  if (inputs.sourceCount !== undefined) {
    if (inputs.sourceCount >= 5) {
      score += 15;
    } else if (inputs.sourceCount >= 3) {
      score += 10;
    } else if (inputs.sourceCount < 2) {
      score -= 10;
      issues.push('Limited data sources');
    }
  }
  
  // Freshness
  if (inputs.dataFreshness !== undefined) {
    if (inputs.dataFreshness >= 0.8) {
      score += 10;
    } else if (inputs.dataFreshness < 0.4) {
      score -= 15;
      issues.push('Stale data');
    }
  }
  
  return {
    name: 'Data Integrity',
    passed: score >= 50,
    score: Math.max(0, Math.min(100, score)),
    weight: LEGITIMACY_CONFIG.WEIGHTS.dataIntegrity,
    issues,
    dataAvailable: avgCoverage > 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN LEGITIMACY ASSESSMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Assess the legitimacy of a project
 * 
 * Returns: LEGIT | WATCH | NOT_LEGIT | INSUFFICIENT_DATA
 */
export function assessLegitimacy(inputs: LegitimacyInputs): LegitimacyResult {
  const normalizedId = inputs.projectId.toLowerCase().replace(/-/g, '');
  
  // Known legitimate projects get fast-tracked
  if (KNOWN_LEGIT_PROJECTS.has(normalizedId)) {
    logger.info(`[Legitimacy Gate] ${inputs.projectId} is KNOWN_LEGIT - fast-tracked`);
    return {
      status: 'LEGIT',
      confidence: 100,
      checks: {
        identity: { name: 'Identity', passed: true, score: 100, weight: 0.25, issues: [], dataAvailable: true },
        marketIntegrity: { name: 'Market', passed: true, score: 100, weight: 0.25, issues: [], dataAvailable: true },
        supplyIntegrity: { name: 'Supply', passed: true, score: 100, weight: 0.20, issues: [], dataAvailable: true },
        protocolSafety: { name: 'Protocol', passed: true, score: 100, weight: 0.15, issues: [], dataAvailable: true },
        dataIntegrity: { name: 'Data', passed: true, score: 100, weight: 0.15, issues: [], dataAvailable: true },
      },
      passedChecks: 5,
      totalChecks: 5,
      failedReasons: [],
      watchReasons: [],
    };
  }
  
  // Run all checks
  const checks = {
    identity: checkIdentity(inputs),
    marketIntegrity: checkMarketIntegrity(inputs),
    supplyIntegrity: checkSupplyIntegrity(inputs),
    protocolSafety: checkProtocolSafety(inputs),
    dataIntegrity: checkDataIntegrity(inputs),
  };
  
  // Calculate overall score
  const checksArray = Object.values(checks);
  const checksWithData = checksArray.filter(c => c.dataAvailable);
  const dataCoverage = checksWithData.length / checksArray.length;
  
  // If insufficient data, return early
  if (dataCoverage < LEGITIMACY_CONFIG.MIN_DATA_COVERAGE) {
    logger.warn(`[Legitimacy Gate] ${inputs.projectId} has INSUFFICIENT_DATA (${(dataCoverage * 100).toFixed(0)}% coverage)`);
    return {
      status: 'INSUFFICIENT_DATA',
      confidence: dataCoverage * 100,
      checks,
      passedChecks: checksArray.filter(c => c.passed).length,
      totalChecks: checksArray.length,
      failedReasons: ['Insufficient data for legitimacy assessment'],
      watchReasons: [],
    };
  }
  
  // Calculate weighted score (only from checks with data)
  let weightedSum = 0;
  let totalWeight = 0;
  
  for (const check of checksWithData) {
    weightedSum += check.score * check.weight;
    totalWeight += check.weight;
  }
  
  const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  const passedChecks = checksArray.filter(c => c.passed).length;
  
  // Collect issues
  const failedReasons: string[] = [];
  const watchReasons: string[] = [];
  
  for (const check of checksArray) {
    if (!check.passed && check.dataAvailable) {
      failedReasons.push(...check.issues);
    } else if (check.issues.length > 0) {
      watchReasons.push(...check.issues);
    }
  }
  
  // Determine status
  let status: LegitimacyStatus;
  let posCap: number | undefined;
  let osCap: number | undefined;
  
  if (overallScore >= LEGITIMACY_CONFIG.LEGIT_THRESHOLD) {
    status = 'LEGIT';
  } else if (overallScore >= LEGITIMACY_CONFIG.WATCH_THRESHOLD) {
    status = 'WATCH';
    posCap = LEGITIMACY_CONFIG.WATCH_POS_CAP;
    osCap = LEGITIMACY_CONFIG.WATCH_OS_CAP;
  } else {
    status = 'NOT_LEGIT';
  }
  
  logger.info(`[Legitimacy Gate] ${inputs.projectId} assessed as ${status}`, {
    score: overallScore.toFixed(1),
    passed: `${passedChecks}/${checksArray.length}`,
    dataCoverage: `${(dataCoverage * 100).toFixed(0)}%`,
  });
  
  return {
    status,
    confidence: Math.min(100, overallScore * dataCoverage),
    checks,
    passedChecks,
    totalChecks: checksArray.length,
    failedReasons,
    watchReasons,
    posCap,
    osCap,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const LegitimacyGate = {
  assessLegitimacy,
  KNOWN_LEGIT_PROJECTS,
  LEGITIMACY_CONFIG,
};

export default LegitimacyGate;
