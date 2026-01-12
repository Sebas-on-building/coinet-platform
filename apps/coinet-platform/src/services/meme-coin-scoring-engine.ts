/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🎯 MEME COIN SCORING ENGINE - Divine Perfection                           ║
 * ║                                                                               ║
 * ║   Advanced scoring engine specifically designed for meme coin analysis.       ║
 * ║   Calculates risk, potential, and generates intelligent verdicts.             ║
 * ║                                                                               ║
 * ║   SCORING PHILOSOPHY:                                                         ║
 * ║   • Risk Score: Higher = more dangerous (0-100)                               ║
 * ║   • Potential Score: Higher = more upside potential (0-100)                   ║
 * ║   • Combine both for intelligent trade decisions                              ║
 * ║                                                                               ║
 * ║   RISK CATEGORIES:                                                            ║
 * ║   • Contract Risks (honeypot, mintable, proxy)                               ║
 * ║   • Liquidity Risks (low depth, concentrated LP)                             ║
 * ║   • Holder Risks (concentration, creator dumping)                            ║
 * ║   • Age Risks (too new, unproven)                                             ║
 * ║   • Social Risks (no verification, suspicious patterns)                       ║
 * ║                                                                               ║
 * ║   POTENTIAL CATEGORIES:                                                       ║
 * ║   • Momentum Signals (buy pressure, velocity)                                 ║
 * ║   • Community Signals (engagement, virality)                                  ║
 * ║   • Technical Signals (bonding progress, graduation)                          ║
 * ║   • Market Signals (timing, narrative)                                        ║
 * ║                                                                               ║
 * ║   @version 1.0.0                                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../utils/logger';
import { TokenInfo, RiskFactor, PotentialSignal, RiskLevel, PotentialLevel } from './meme-coin-intelligence';
import { PumpFunAnalysis, PumpFunToken } from './pump-fun-api';
import { HolderDistribution } from './solscan-api';
import { EnhancedDexToken } from './dexscreener';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Complete scoring result
 */
export interface ScoringResult {
  // Risk
  riskScore: number;
  riskLevel: RiskLevel;
  riskFactors: RiskFactor[];
  riskBreakdown: RiskBreakdown;
  
  // Potential
  potentialScore: number;
  potentialLevel: PotentialLevel;
  potentialSignals: PotentialSignal[];
  potentialBreakdown: PotentialBreakdown;
  
  // Combined analysis
  riskRewardRatio: number;
  tradingRecommendation: TradingRecommendation;
  confidenceLevel: number;  // 0-100, how confident are we in this analysis
  
  // Metadata
  scoringVersion: string;
  calculatedAt: Date;
}

/**
 * Risk breakdown by category
 */
export interface RiskBreakdown {
  contractRisk: number;      // 0-30 points
  liquidityRisk: number;     // 0-25 points
  holderRisk: number;        // 0-25 points
  ageRisk: number;           // 0-15 points
  socialRisk: number;        // 0-10 points
  totalRaw: number;          // Before cap
  adjustments: string[];     // Any adjustments made
}

/**
 * Potential breakdown by category
 */
export interface PotentialBreakdown {
  momentumSignals: number;   // 0-30 points
  communitySignals: number;  // 0-25 points
  technicalSignals: number;  // 0-25 points
  marketSignals: number;     // 0-15 points
  narrativeBonus: number;    // 0-10 points
  totalRaw: number;
  adjustments: string[];
}

/**
 * Trading recommendation
 */
export interface TradingRecommendation {
  action: 'AVOID' | 'HIGH_RISK_SMALL_SIZE' | 'MODERATE_RISK' | 'FAVORABLE' | 'STRONG_SETUP';
  reasoning: string;
  suggestedSizePercent: number;  // % of usual position size
  entryStrategy: string;
  exitStrategy: string;
  timeHorizon: string;
}

/**
 * Input data for scoring
 */
export interface ScoringInput {
  token: TokenInfo | null;
  pumpFunData: PumpFunAnalysis | null;
  holderDistribution: HolderDistribution | null;
  enhancedDexData: EnhancedDexToken | null;
  securityData: SecurityInput | null;
}

/**
 * Security scan input (from GoPlus or derived)
 */
export interface SecurityInput {
  isHoneypot: boolean;
  isMintable: boolean;
  hasProxy: boolean;
  hasBlacklist: boolean;
  canRevokeOwnership: boolean;
  buyTax: number;
  sellTax: number;
  isOpenSource: boolean;
  isLiquidityLocked: boolean;
}

// ============================================================================
// SCORING CONSTANTS
// ============================================================================

const SCORING_VERSION = '1.0.0';

/**
 * Risk scoring weights and thresholds
 */
const RISK_CONFIG = {
  // Contract risks (max 30 points) - CRITICAL
  contract: {
    honeypot: 30,           // Instant max risk if honeypot
    mintable: 25,           // Can rug by minting
    proxy: 15,              // Upgradeable contract
    blacklist: 12,          // Can blacklist sellers
    revokeOwnership: 10,    // Can take back control
    notOpenSource: 8,       // Can't verify code
    highBuyTax: { threshold: 5, points: 8 },
    highSellTax: { threshold: 5, points: 12 },
    extremeSellTax: { threshold: 15, points: 20 },
  },
  
  // Liquidity risks (max 25 points)
  liquidity: {
    extremelyLow: { threshold: 1000, points: 25 },      // < $1K
    veryLow: { threshold: 5000, points: 20 },           // < $5K
    low: { threshold: 10000, points: 15 },              // < $10K
    medium: { threshold: 25000, points: 10 },           // < $25K
    adequate: { threshold: 50000, points: 5 },          // < $50K
    notLocked: 8,                                        // LP not locked
    concentratedLP: 12,                                  // Few LP holders
  },
  
  // Holder risks (max 25 points)
  holder: {
    extremeConcentration: { threshold: 80, points: 20 }, // Top 10 > 80%
    highConcentration: { threshold: 60, points: 15 },    // Top 10 > 60%
    mediumConcentration: { threshold: 40, points: 8 },   // Top 10 > 40%
    fewHolders: { threshold: 50, points: 12 },           // < 50 holders
    veryFewHolders: { threshold: 20, points: 18 },       // < 20 holders
    creatorDumping: { threshold: 10, points: 20 },       // Creator sold > 10%
    creatorDumpedHard: { threshold: 30, points: 25 },    // Creator sold > 30%
    largeWhaleSell: { threshold: 5, points: 10 },        // Single sell > 5%
  },
  
  // Age risks (max 15 points)
  age: {
    extremelyNew: { threshold: 0.5, points: 15 },        // < 30 min
    veryNew: { threshold: 1, points: 12 },               // < 1 hour
    new: { threshold: 6, points: 8 },                    // < 6 hours
    recent: { threshold: 24, points: 5 },                // < 24 hours
  },
  
  // Social risks (max 10 points)
  social: {
    noSocials: 8,
    noEngagement: 5,
    suspiciousActivity: 10,
  },
};

/**
 * Potential scoring weights and thresholds
 */
const POTENTIAL_CONFIG = {
  // Momentum signals (max 30 points)
  momentum: {
    extremeBuyPressure: { threshold: 0.80, points: 20 },  // > 80% buys
    strongBuyPressure: { threshold: 0.70, points: 15 },   // > 70% buys
    goodBuyPressure: { threshold: 0.60, points: 10 },     // > 60% buys
    highVelocity: { threshold: 80, points: 15 },          // Velocity > 80
    goodVelocity: { threshold: 50, points: 10 },          // Velocity > 50
    positiveMomentum5m: { threshold: 10, points: 8 },     // > 10% in 5m
    positiveMomentum1h: { threshold: 20, points: 10 },    // > 20% in 1h
  },
  
  // Community signals (max 25 points)
  community: {
    highEngagement: { threshold: 100, points: 15 },       // > 100 replies
    goodEngagement: { threshold: 50, points: 10 },        // > 50 replies
    someEngagement: { threshold: 20, points: 5 },         // > 20 replies
    kingOfTheHill: 15,                                    // KOTH status
    manyTraders: { threshold: 100, points: 12 },          // > 100 unique traders
    growingHolders: { threshold: 500, points: 10 },       // > 500 holders
    largeHolderBase: { threshold: 1000, points: 15 },     // > 1000 holders
  },
  
  // Technical signals (max 25 points)
  technical: {
    nearGraduation: { threshold: 80, points: 20 },        // > 80% bonding
    goodBondingProgress: { threshold: 60, points: 15 },   // > 60% bonding
    someBondingProgress: { threshold: 40, points: 8 },    // > 40% bonding
    graduated: 15,                                        // On Raydium
    goodLiquidity: { threshold: 100000, points: 12 },     // > $100K liq
    healthyVolume: { threshold: 100000, points: 10 },     // > $100K vol
    lowConcentration: { threshold: 30, points: 10 },      // Top 10 < 30%
  },
  
  // Market signals (max 15 points)
  market: {
    microCap: { threshold: 100000, points: 10 },          // < $100K mcap
    lowCap: { threshold: 500000, points: 8 },             // < $500K mcap
    midCap: { threshold: 2000000, points: 5 },            // < $2M mcap
    devHolding: 8,                                        // Creator not selling
    verifiedSocials: 5,                                   // Has socials
    establishedAge: { threshold: 168, points: 8 },        // > 7 days
  },
  
  // Narrative bonus (max 10 points)
  narrative: {
    trendingTheme: 10,
    strongMeme: 8,
    uniqueConcept: 6,
  },
};

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

/**
 * 🎯 Calculate comprehensive meme coin score
 * This is the main entry point for the scoring engine
 */
export function calculateScore(input: ScoringInput): ScoringResult {
  const startTime = performance.now();
  
  logger.debug('🎯 Scoring engine started', {
    hasToken: !!input.token,
    hasPumpFun: !!input.pumpFunData,
    hasHolders: !!input.holderDistribution,
    hasEnhanced: !!input.enhancedDexData,
  });

  // Calculate risk
  const { score: riskScore, factors: riskFactors, breakdown: riskBreakdown } = calculateRiskScore(input);
  const riskLevel = getRiskLevel(riskScore);

  // Calculate potential
  const { score: potentialScore, signals: potentialSignals, breakdown: potentialBreakdown } = calculatePotentialScore(input);
  const potentialLevel = getPotentialLevel(potentialScore);

  // Calculate risk/reward ratio
  const riskRewardRatio = calculateRiskRewardRatio(riskScore, potentialScore);

  // Generate trading recommendation
  const tradingRecommendation = generateTradingRecommendation(
    riskScore,
    potentialScore,
    riskFactors,
    potentialSignals,
    input
  );

  // Calculate confidence level
  const confidenceLevel = calculateConfidenceLevel(input);

  const result: ScoringResult = {
    riskScore,
    riskLevel,
    riskFactors,
    riskBreakdown,
    potentialScore,
    potentialLevel,
    potentialSignals,
    potentialBreakdown,
    riskRewardRatio,
    tradingRecommendation,
    confidenceLevel,
    scoringVersion: SCORING_VERSION,
    calculatedAt: new Date(),
  };

  logger.debug('🎯 Scoring complete', {
    riskScore,
    potentialScore,
    riskRewardRatio: riskRewardRatio.toFixed(2),
    recommendation: tradingRecommendation.action,
    confidence: confidenceLevel,
    timeMs: (performance.now() - startTime).toFixed(1),
  });

  return result;
}

// ============================================================================
// RISK SCORING
// ============================================================================

/**
 * Calculate comprehensive risk score
 */
function calculateRiskScore(input: ScoringInput): {
  score: number;
  factors: RiskFactor[];
  breakdown: RiskBreakdown;
} {
  const factors: RiskFactor[] = [];
  const breakdown: RiskBreakdown = {
    contractRisk: 0,
    liquidityRisk: 0,
    holderRisk: 0,
    ageRisk: 0,
    socialRisk: 0,
    totalRaw: 0,
    adjustments: [],
  };

  const { token, pumpFunData, holderDistribution, enhancedDexData, securityData } = input;

  if (!token && !pumpFunData?.token) {
    return {
      score: 95,
      factors: [{
        id: 'no_data',
        name: 'No Data Available',
        severity: 'critical',
        points: 50,
        description: 'Unable to fetch any token data - cannot verify safety',
        source: 'system',
      }],
      breakdown: { ...breakdown, totalRaw: 95 },
    };
  }

  // ========================================================================
  // CONTRACT RISKS (max 30 points)
  // ========================================================================
  if (securityData) {
    if (securityData.isHoneypot) {
      factors.push(createRiskFactor('honeypot', 'Honeypot Detected', 'critical',
        RISK_CONFIG.contract.honeypot, 'Contract prevents selling - CONFIRMED SCAM', 'SecurityScan'));
      breakdown.contractRisk += RISK_CONFIG.contract.honeypot;
    }

    if (securityData.isMintable) {
      factors.push(createRiskFactor('mintable', 'Mintable Token', 'critical',
        RISK_CONFIG.contract.mintable, 'Owner can mint unlimited tokens - extreme rug risk', 'SecurityScan'));
      breakdown.contractRisk += RISK_CONFIG.contract.mintable;
    }

    if (securityData.hasProxy) {
      factors.push(createRiskFactor('proxy', 'Proxy Contract', 'high',
        RISK_CONFIG.contract.proxy, 'Contract can be upgraded - code could change', 'SecurityScan'));
      breakdown.contractRisk += RISK_CONFIG.contract.proxy;
    }

    if (securityData.hasBlacklist) {
      factors.push(createRiskFactor('blacklist', 'Has Blacklist', 'medium',
        RISK_CONFIG.contract.blacklist, 'Contract can blacklist addresses from selling', 'SecurityScan'));
      breakdown.contractRisk += RISK_CONFIG.contract.blacklist;
    }

    if (securityData.sellTax >= 15) {
      factors.push(createRiskFactor('extreme_tax', 'Extreme Sell Tax', 'critical',
        RISK_CONFIG.contract.extremeSellTax.points, `${securityData.sellTax}% sell tax - near honeypot`, 'SecurityScan'));
      breakdown.contractRisk += RISK_CONFIG.contract.extremeSellTax.points;
    } else if (securityData.sellTax >= 5) {
      factors.push(createRiskFactor('high_sell_tax', 'High Sell Tax', 'high',
        RISK_CONFIG.contract.highSellTax.points, `${securityData.sellTax}% sell tax eats into profits`, 'SecurityScan'));
      breakdown.contractRisk += RISK_CONFIG.contract.highSellTax.points;
    }
  }

  // Cap contract risk at 30
  breakdown.contractRisk = Math.min(30, breakdown.contractRisk);

  // ========================================================================
  // LIQUIDITY RISKS (max 25 points)
  // ========================================================================
  const liquidity = token?.liquidity || pumpFunData?.token?.liquidityEstimateUsd || 0;

  if (liquidity < RISK_CONFIG.liquidity.extremelyLow.threshold) {
    factors.push(createRiskFactor('extreme_low_liq', 'Extremely Low Liquidity', 'critical',
      RISK_CONFIG.liquidity.extremelyLow.points, 
      `Only $${formatNumber(liquidity)} liquidity - nearly untradeable`, 'DexScreener'));
    breakdown.liquidityRisk += RISK_CONFIG.liquidity.extremelyLow.points;
  } else if (liquidity < RISK_CONFIG.liquidity.veryLow.threshold) {
    factors.push(createRiskFactor('very_low_liq', 'Very Low Liquidity', 'high',
      RISK_CONFIG.liquidity.veryLow.points,
      `Only $${formatNumber(liquidity)} liquidity - extreme slippage`, 'DexScreener'));
    breakdown.liquidityRisk += RISK_CONFIG.liquidity.veryLow.points;
  } else if (liquidity < RISK_CONFIG.liquidity.low.threshold) {
    factors.push(createRiskFactor('low_liq', 'Low Liquidity', 'medium',
      RISK_CONFIG.liquidity.low.points,
      `$${formatNumber(liquidity)} liquidity - significant slippage risk`, 'DexScreener'));
    breakdown.liquidityRisk += RISK_CONFIG.liquidity.low.points;
  } else if (liquidity < RISK_CONFIG.liquidity.medium.threshold) {
    factors.push(createRiskFactor('medium_liq', 'Moderate Liquidity', 'low',
      RISK_CONFIG.liquidity.medium.points,
      `$${formatNumber(liquidity)} liquidity - some slippage on larger trades`, 'DexScreener'));
    breakdown.liquidityRisk += RISK_CONFIG.liquidity.medium.points;
  }

  // Cap liquidity risk at 25
  breakdown.liquidityRisk = Math.min(25, breakdown.liquidityRisk);

  // ========================================================================
  // HOLDER RISKS (max 25 points)
  // ========================================================================
  
  // Creator dumping (highest priority holder risk)
  if (pumpFunData?.isCreatorSelling) {
    const creatorSold = pumpFunData.creatorSellPercent;
    if (creatorSold >= RISK_CONFIG.holder.creatorDumpedHard.threshold) {
      factors.push(createRiskFactor('creator_dumped_hard', 'Creator Dumped Hard', 'critical',
        RISK_CONFIG.holder.creatorDumpedHard.points,
        `Creator sold ${creatorSold.toFixed(1)}% of supply - likely abandoning`, 'Pump.fun'));
      breakdown.holderRisk += RISK_CONFIG.holder.creatorDumpedHard.points;
    } else if (creatorSold >= RISK_CONFIG.holder.creatorDumping.threshold) {
      factors.push(createRiskFactor('creator_selling', 'Creator Selling', 'high',
        RISK_CONFIG.holder.creatorDumping.points,
        `Creator has sold ${creatorSold.toFixed(1)}% of supply`, 'Pump.fun'));
      breakdown.holderRisk += RISK_CONFIG.holder.creatorDumping.points;
    }
  }

  // Holder concentration
  if (holderDistribution) {
    const top10 = holderDistribution.top10Percent;
    if (top10 >= RISK_CONFIG.holder.extremeConcentration.threshold) {
      factors.push(createRiskFactor('extreme_concentration', 'Extreme Holder Concentration', 'critical',
        RISK_CONFIG.holder.extremeConcentration.points,
        `Top 10 holders own ${top10.toFixed(0)}% - one dump could crash it`, 'Solscan'));
      breakdown.holderRisk += RISK_CONFIG.holder.extremeConcentration.points;
    } else if (top10 >= RISK_CONFIG.holder.highConcentration.threshold) {
      factors.push(createRiskFactor('high_concentration', 'High Holder Concentration', 'high',
        RISK_CONFIG.holder.highConcentration.points,
        `Top 10 holders own ${top10.toFixed(0)}% - significant whale risk`, 'Solscan'));
      breakdown.holderRisk += RISK_CONFIG.holder.highConcentration.points;
    } else if (top10 >= RISK_CONFIG.holder.mediumConcentration.threshold) {
      factors.push(createRiskFactor('medium_concentration', 'Moderate Concentration', 'medium',
        RISK_CONFIG.holder.mediumConcentration.points,
        `Top 10 holders own ${top10.toFixed(0)}%`, 'Solscan'));
      breakdown.holderRisk += RISK_CONFIG.holder.mediumConcentration.points;
    }

    // Few holders
    if (holderDistribution.totalHolders < RISK_CONFIG.holder.veryFewHolders.threshold) {
      factors.push(createRiskFactor('very_few_holders', 'Very Few Holders', 'high',
        RISK_CONFIG.holder.veryFewHolders.points,
        `Only ${holderDistribution.totalHolders} holders - extremely thin market`, 'Solscan'));
      breakdown.holderRisk += RISK_CONFIG.holder.veryFewHolders.points;
    } else if (holderDistribution.totalHolders < RISK_CONFIG.holder.fewHolders.threshold) {
      factors.push(createRiskFactor('few_holders', 'Few Holders', 'medium',
        RISK_CONFIG.holder.fewHolders.points,
        `Only ${holderDistribution.totalHolders} holders - limited market depth`, 'Solscan'));
      breakdown.holderRisk += RISK_CONFIG.holder.fewHolders.points;
    }
  }

  // Large single sell detection
  if (pumpFunData && pumpFunData.largestSellPercent >= RISK_CONFIG.holder.largeWhaleSell.threshold) {
    factors.push(createRiskFactor('large_sell', 'Large Whale Sell Detected', 'medium',
      RISK_CONFIG.holder.largeWhaleSell.points,
      `Single sell of ${pumpFunData.largestSellPercent.toFixed(1)}% detected`, 'Pump.fun'));
    breakdown.holderRisk += RISK_CONFIG.holder.largeWhaleSell.points;
  }

  // Cap holder risk at 25
  breakdown.holderRisk = Math.min(25, breakdown.holderRisk);

  // ========================================================================
  // AGE RISKS (max 15 points)
  // ========================================================================
  const ageHours = token?.pairAge || pumpFunData?.token?.ageHours || 9999;

  if (ageHours < RISK_CONFIG.age.extremelyNew.threshold) {
    factors.push(createRiskFactor('extremely_new', 'Extremely New Token', 'critical',
      RISK_CONFIG.age.extremelyNew.points,
      `Only ${Math.round(ageHours * 60)} minutes old - maximum volatility and risk`, 'DexScreener'));
    breakdown.ageRisk += RISK_CONFIG.age.extremelyNew.points;
  } else if (ageHours < RISK_CONFIG.age.veryNew.threshold) {
    factors.push(createRiskFactor('very_new', 'Very New Token', 'high',
      RISK_CONFIG.age.veryNew.points,
      `Only ${Math.round(ageHours * 60)} minutes old - high volatility expected`, 'DexScreener'));
    breakdown.ageRisk += RISK_CONFIG.age.veryNew.points;
  } else if (ageHours < RISK_CONFIG.age.new.threshold) {
    factors.push(createRiskFactor('new_token', 'New Token', 'medium',
      RISK_CONFIG.age.new.points,
      `${ageHours.toFixed(1)} hours old - still in high-risk phase`, 'DexScreener'));
    breakdown.ageRisk += RISK_CONFIG.age.new.points;
  } else if (ageHours < RISK_CONFIG.age.recent.threshold) {
    factors.push(createRiskFactor('recent_token', 'Recent Token', 'low',
      RISK_CONFIG.age.recent.points,
      `${ageHours.toFixed(0)} hours old - still relatively new`, 'DexScreener'));
    breakdown.ageRisk += RISK_CONFIG.age.recent.points;
  }

  // Cap age risk at 15
  breakdown.ageRisk = Math.min(15, breakdown.ageRisk);

  // ========================================================================
  // SOCIAL RISKS (max 10 points)
  // ========================================================================
  const hasSocials = token?.isVerified || pumpFunData?.token?.hasSocials || false;
  const replyCount = pumpFunData?.token?.replyCount || 0;

  if (!hasSocials) {
    factors.push(createRiskFactor('no_socials', 'No Verified Socials', 'low',
      RISK_CONFIG.social.noSocials,
      'No verified Twitter, Telegram, or website', 'DexScreener'));
    breakdown.socialRisk += RISK_CONFIG.social.noSocials;
  }

  if (replyCount < 5 && pumpFunData?.token) {
    factors.push(createRiskFactor('no_engagement', 'No Community Engagement', 'low',
      RISK_CONFIG.social.noEngagement,
      `Only ${replyCount} replies on pump.fun`, 'Pump.fun'));
    breakdown.socialRisk += RISK_CONFIG.social.noEngagement;
  }

  // Cap social risk at 10
  breakdown.socialRisk = Math.min(10, breakdown.socialRisk);

  // ========================================================================
  // CALCULATE TOTAL
  // ========================================================================
  breakdown.totalRaw = breakdown.contractRisk + breakdown.liquidityRisk + 
                       breakdown.holderRisk + breakdown.ageRisk + breakdown.socialRisk;

  // Apply adjustments
  let finalScore = breakdown.totalRaw;

  // If no critical factors and decent liquidity, reduce score slightly
  const hasCritical = factors.some(f => f.severity === 'critical');
  if (!hasCritical && liquidity >= 25000) {
    finalScore = Math.max(0, finalScore - 5);
    breakdown.adjustments.push('-5 (no critical issues, decent liquidity)');
  }

  // If pump.fun and not graduated, bonding curve progress gives some validation
  if (pumpFunData?.token && !pumpFunData.token.isGraduated) {
    if (pumpFunData.token.bondingCurveProgress >= 50) {
      finalScore = Math.max(0, finalScore - 3);
      breakdown.adjustments.push('-3 (>50% bonding progress shows traction)');
    }
  }

  // Cap at 100
  finalScore = Math.min(100, Math.max(0, finalScore));

  return { score: Math.round(finalScore), factors, breakdown };
}

// ============================================================================
// POTENTIAL SCORING
// ============================================================================

/**
 * Calculate potential score
 */
function calculatePotentialScore(input: ScoringInput): {
  score: number;
  signals: PotentialSignal[];
  breakdown: PotentialBreakdown;
} {
  const signals: PotentialSignal[] = [];
  const breakdown: PotentialBreakdown = {
    momentumSignals: 0,
    communitySignals: 0,
    technicalSignals: 0,
    marketSignals: 0,
    narrativeBonus: 0,
    totalRaw: 0,
    adjustments: [],
  };

  const { token, pumpFunData, holderDistribution, enhancedDexData } = input;

  if (!token && !pumpFunData?.token) {
    return { score: 0, signals: [], breakdown };
  }

  // ========================================================================
  // MOMENTUM SIGNALS (max 30 points)
  // ========================================================================
  const buyRatio = token?.buysSells24hRatio || 
    (pumpFunData ? pumpFunData.buyCount / Math.max(1, pumpFunData.buyCount + pumpFunData.sellCount) : 0.5);

  if (buyRatio >= POTENTIAL_CONFIG.momentum.extremeBuyPressure.threshold) {
    signals.push(createPotentialSignal('extreme_buy_pressure', 'Extreme Buy Pressure', 'strong',
      POTENTIAL_CONFIG.momentum.extremeBuyPressure.points,
      `${(buyRatio * 100).toFixed(0)}% of transactions are buys - very bullish`, 'DexScreener'));
    breakdown.momentumSignals += POTENTIAL_CONFIG.momentum.extremeBuyPressure.points;
  } else if (buyRatio >= POTENTIAL_CONFIG.momentum.strongBuyPressure.threshold) {
    signals.push(createPotentialSignal('strong_buy_pressure', 'Strong Buy Pressure', 'moderate',
      POTENTIAL_CONFIG.momentum.strongBuyPressure.points,
      `${(buyRatio * 100).toFixed(0)}% of transactions are buys`, 'DexScreener'));
    breakdown.momentumSignals += POTENTIAL_CONFIG.momentum.strongBuyPressure.points;
  } else if (buyRatio >= POTENTIAL_CONFIG.momentum.goodBuyPressure.threshold) {
    signals.push(createPotentialSignal('good_buy_pressure', 'Good Buy Pressure', 'weak',
      POTENTIAL_CONFIG.momentum.goodBuyPressure.points,
      `${(buyRatio * 100).toFixed(0)}% of transactions are buys`, 'DexScreener'));
    breakdown.momentumSignals += POTENTIAL_CONFIG.momentum.goodBuyPressure.points;
  }

  // Velocity (from pump.fun data)
  if (pumpFunData) {
    if (pumpFunData.velocityScore >= POTENTIAL_CONFIG.momentum.highVelocity.threshold) {
      signals.push(createPotentialSignal('high_velocity', 'High Trading Velocity', 'strong',
        POTENTIAL_CONFIG.momentum.highVelocity.points,
        `Velocity score ${pumpFunData.velocityScore}/100 - very active`, 'Pump.fun'));
      breakdown.momentumSignals += POTENTIAL_CONFIG.momentum.highVelocity.points;
    } else if (pumpFunData.velocityScore >= POTENTIAL_CONFIG.momentum.goodVelocity.threshold) {
      signals.push(createPotentialSignal('good_velocity', 'Good Trading Velocity', 'moderate',
        POTENTIAL_CONFIG.momentum.goodVelocity.points,
        `Velocity score ${pumpFunData.velocityScore}/100`, 'Pump.fun'));
      breakdown.momentumSignals += POTENTIAL_CONFIG.momentum.goodVelocity.points;
    }
  }

  // Price momentum
  const priceChange1h = token?.priceChange1h || 0;
  const priceChange5m = token?.priceChange5m || 0;

  if (priceChange5m >= POTENTIAL_CONFIG.momentum.positiveMomentum5m.threshold) {
    signals.push(createPotentialSignal('momentum_5m', 'Strong 5-Minute Momentum', 'moderate',
      POTENTIAL_CONFIG.momentum.positiveMomentum5m.points,
      `+${priceChange5m.toFixed(0)}% in last 5 minutes`, 'DexScreener'));
    breakdown.momentumSignals += POTENTIAL_CONFIG.momentum.positiveMomentum5m.points;
  }

  if (priceChange1h >= POTENTIAL_CONFIG.momentum.positiveMomentum1h.threshold) {
    signals.push(createPotentialSignal('momentum_1h', 'Strong Hourly Momentum', 'strong',
      POTENTIAL_CONFIG.momentum.positiveMomentum1h.points,
      `+${priceChange1h.toFixed(0)}% in last hour`, 'DexScreener'));
    breakdown.momentumSignals += POTENTIAL_CONFIG.momentum.positiveMomentum1h.points;
  }

  // Cap momentum at 30
  breakdown.momentumSignals = Math.min(30, breakdown.momentumSignals);

  // ========================================================================
  // COMMUNITY SIGNALS (max 25 points)
  // ========================================================================
  if (pumpFunData?.token) {
    // Reply count
    const replies = pumpFunData.token.replyCount;
    if (replies >= POTENTIAL_CONFIG.community.highEngagement.threshold) {
      signals.push(createPotentialSignal('high_engagement', 'High Community Engagement', 'strong',
        POTENTIAL_CONFIG.community.highEngagement.points,
        `${replies} replies on pump.fun - very active discussion`, 'Pump.fun'));
      breakdown.communitySignals += POTENTIAL_CONFIG.community.highEngagement.points;
    } else if (replies >= POTENTIAL_CONFIG.community.goodEngagement.threshold) {
      signals.push(createPotentialSignal('good_engagement', 'Good Community Engagement', 'moderate',
        POTENTIAL_CONFIG.community.goodEngagement.points,
        `${replies} replies on pump.fun`, 'Pump.fun'));
      breakdown.communitySignals += POTENTIAL_CONFIG.community.goodEngagement.points;
    } else if (replies >= POTENTIAL_CONFIG.community.someEngagement.threshold) {
      signals.push(createPotentialSignal('some_engagement', 'Some Community Engagement', 'weak',
        POTENTIAL_CONFIG.community.someEngagement.points,
        `${replies} replies on pump.fun`, 'Pump.fun'));
      breakdown.communitySignals += POTENTIAL_CONFIG.community.someEngagement.points;
    }

    // King of the Hill
    if (pumpFunData.token.isKingOfTheHill) {
      signals.push(createPotentialSignal('koth', 'King of the Hill', 'strong',
        POTENTIAL_CONFIG.community.kingOfTheHill,
        'Currently trending on pump.fun homepage', 'Pump.fun'));
      breakdown.communitySignals += POTENTIAL_CONFIG.community.kingOfTheHill;
    }

    // Unique traders
    if (pumpFunData.uniqueTraders >= POTENTIAL_CONFIG.community.manyTraders.threshold) {
      signals.push(createPotentialSignal('many_traders', 'Many Unique Traders', 'moderate',
        POTENTIAL_CONFIG.community.manyTraders.points,
        `${pumpFunData.uniqueTraders} unique traders recently`, 'Pump.fun'));
      breakdown.communitySignals += POTENTIAL_CONFIG.community.manyTraders.points;
    }
  }

  // Holder base (from Solscan)
  if (holderDistribution) {
    if (holderDistribution.totalHolders >= POTENTIAL_CONFIG.community.largeHolderBase.threshold) {
      signals.push(createPotentialSignal('large_holder_base', 'Large Holder Base', 'strong',
        POTENTIAL_CONFIG.community.largeHolderBase.points,
        `${holderDistribution.totalHolders.toLocaleString()} holders - strong distribution`, 'Solscan'));
      breakdown.communitySignals += POTENTIAL_CONFIG.community.largeHolderBase.points;
    } else if (holderDistribution.totalHolders >= POTENTIAL_CONFIG.community.growingHolders.threshold) {
      signals.push(createPotentialSignal('growing_holders', 'Good Holder Base', 'moderate',
        POTENTIAL_CONFIG.community.growingHolders.points,
        `${holderDistribution.totalHolders.toLocaleString()} holders`, 'Solscan'));
      breakdown.communitySignals += POTENTIAL_CONFIG.community.growingHolders.points;
    }
  }

  // Cap community at 25
  breakdown.communitySignals = Math.min(25, breakdown.communitySignals);

  // ========================================================================
  // TECHNICAL SIGNALS (max 25 points)
  // ========================================================================
  
  // Bonding curve progress
  if (pumpFunData?.token && !pumpFunData.token.isGraduated) {
    const bonding = pumpFunData.token.bondingCurveProgress;
    if (bonding >= POTENTIAL_CONFIG.technical.nearGraduation.threshold) {
      signals.push(createPotentialSignal('near_graduation', 'Near Graduation', 'strong',
        POTENTIAL_CONFIG.technical.nearGraduation.points,
        `${bonding.toFixed(0)}% bonding curve - close to Raydium listing`, 'Pump.fun'));
      breakdown.technicalSignals += POTENTIAL_CONFIG.technical.nearGraduation.points;
    } else if (bonding >= POTENTIAL_CONFIG.technical.goodBondingProgress.threshold) {
      signals.push(createPotentialSignal('good_bonding', 'Good Bonding Progress', 'moderate',
        POTENTIAL_CONFIG.technical.goodBondingProgress.points,
        `${bonding.toFixed(0)}% bonding curve progress`, 'Pump.fun'));
      breakdown.technicalSignals += POTENTIAL_CONFIG.technical.goodBondingProgress.points;
    } else if (bonding >= POTENTIAL_CONFIG.technical.someBondingProgress.threshold) {
      signals.push(createPotentialSignal('some_bonding', 'Some Bonding Progress', 'weak',
        POTENTIAL_CONFIG.technical.someBondingProgress.points,
        `${bonding.toFixed(0)}% bonding curve progress`, 'Pump.fun'));
      breakdown.technicalSignals += POTENTIAL_CONFIG.technical.someBondingProgress.points;
    }
  }

  // Already graduated
  if (pumpFunData?.token?.isGraduated) {
    signals.push(createPotentialSignal('graduated', 'Graduated to Raydium', 'moderate',
      POTENTIAL_CONFIG.technical.graduated,
      'Successfully graduated from pump.fun bonding curve', 'Pump.fun'));
    breakdown.technicalSignals += POTENTIAL_CONFIG.technical.graduated;
  }

  // Liquidity
  const liquidity = token?.liquidity || pumpFunData?.token?.liquidityEstimateUsd || 0;
  if (liquidity >= POTENTIAL_CONFIG.technical.goodLiquidity.threshold) {
    signals.push(createPotentialSignal('good_liquidity', 'Good Liquidity', 'moderate',
      POTENTIAL_CONFIG.technical.goodLiquidity.points,
      `$${formatNumber(liquidity)} liquidity - reasonable depth`, 'DexScreener'));
    breakdown.technicalSignals += POTENTIAL_CONFIG.technical.goodLiquidity.points;
  }

  // Volume
  const volume = token?.volume24h || 0;
  if (volume >= POTENTIAL_CONFIG.technical.healthyVolume.threshold) {
    signals.push(createPotentialSignal('healthy_volume', 'Healthy Volume', 'moderate',
      POTENTIAL_CONFIG.technical.healthyVolume.points,
      `$${formatNumber(volume)} 24h volume - active trading`, 'DexScreener'));
    breakdown.technicalSignals += POTENTIAL_CONFIG.technical.healthyVolume.points;
  }

  // Low concentration (good distribution)
  if (holderDistribution && holderDistribution.top10Percent < POTENTIAL_CONFIG.technical.lowConcentration.threshold) {
    signals.push(createPotentialSignal('good_distribution', 'Excellent Distribution', 'moderate',
      POTENTIAL_CONFIG.technical.lowConcentration.points,
      `Top 10 only hold ${holderDistribution.top10Percent.toFixed(0)}% - healthy distribution`, 'Solscan'));
    breakdown.technicalSignals += POTENTIAL_CONFIG.technical.lowConcentration.points;
  }

  // Cap technical at 25
  breakdown.technicalSignals = Math.min(25, breakdown.technicalSignals);

  // ========================================================================
  // MARKET SIGNALS (max 15 points)
  // ========================================================================
  const marketCap = token?.marketCap || pumpFunData?.token?.marketCapUsd || 0;

  if (marketCap > 0 && marketCap < POTENTIAL_CONFIG.market.microCap.threshold) {
    signals.push(createPotentialSignal('micro_cap', 'Micro Cap Gem', 'strong',
      POTENTIAL_CONFIG.market.microCap.points,
      `$${formatNumber(marketCap)} market cap - significant room for growth`, 'DexScreener'));
    breakdown.marketSignals += POTENTIAL_CONFIG.market.microCap.points;
  } else if (marketCap > 0 && marketCap < POTENTIAL_CONFIG.market.lowCap.threshold) {
    signals.push(createPotentialSignal('low_cap', 'Low Cap Potential', 'moderate',
      POTENTIAL_CONFIG.market.lowCap.points,
      `$${formatNumber(marketCap)} market cap - room for growth`, 'DexScreener'));
    breakdown.marketSignals += POTENTIAL_CONFIG.market.lowCap.points;
  }

  // Dev holding
  if (pumpFunData && !pumpFunData.isCreatorSelling) {
    signals.push(createPotentialSignal('dev_holding', 'Developer Holding', 'weak',
      POTENTIAL_CONFIG.market.devHolding,
      'Creator has not sold tokens - committed to project', 'Pump.fun'));
    breakdown.marketSignals += POTENTIAL_CONFIG.market.devHolding;
  }

  // Verified socials
  if (token?.isVerified || pumpFunData?.token?.hasSocials) {
    signals.push(createPotentialSignal('verified_socials', 'Verified Socials', 'weak',
      POTENTIAL_CONFIG.market.verifiedSocials,
      'Has verified website or social links', 'DexScreener'));
    breakdown.marketSignals += POTENTIAL_CONFIG.market.verifiedSocials;
  }

  // Established age
  const ageHours = token?.pairAge || pumpFunData?.token?.ageHours || 0;
  if (ageHours >= POTENTIAL_CONFIG.market.establishedAge.threshold) {
    signals.push(createPotentialSignal('established', 'Established Token', 'weak',
      POTENTIAL_CONFIG.market.establishedAge.points,
      `${Math.floor(ageHours / 24)} days old - survived initial volatility`, 'DexScreener'));
    breakdown.marketSignals += POTENTIAL_CONFIG.market.establishedAge.points;
  }

  // Cap market at 15
  breakdown.marketSignals = Math.min(15, breakdown.marketSignals);

  // ========================================================================
  // NARRATIVE BONUS (max 10 points)
  // ========================================================================
  // This would ideally analyze token name/description for trending themes
  // For now, we check for KOTH as a proxy for viral narrative
  if (pumpFunData?.token?.isKingOfTheHill) {
    breakdown.narrativeBonus += 5; // Additional bonus for trending
    breakdown.adjustments.push('+5 (KOTH indicates strong narrative)');
  }

  // Cap narrative at 10
  breakdown.narrativeBonus = Math.min(10, breakdown.narrativeBonus);

  // ========================================================================
  // CALCULATE TOTAL
  // ========================================================================
  breakdown.totalRaw = breakdown.momentumSignals + breakdown.communitySignals + 
                       breakdown.technicalSignals + breakdown.marketSignals + 
                       breakdown.narrativeBonus;

  let finalScore = breakdown.totalRaw;

  // If multiple strong signals align, add bonus
  const strongSignals = signals.filter(s => s.strength === 'strong').length;
  if (strongSignals >= 3) {
    finalScore = Math.min(100, finalScore + 10);
    breakdown.adjustments.push('+10 (multiple strong signals aligned)');
  }

  // Cap at 100
  finalScore = Math.min(100, Math.max(0, finalScore));

  return { score: Math.round(finalScore), signals, breakdown };
}

// ============================================================================
// TRADING RECOMMENDATION
// ============================================================================

/**
 * Generate trading recommendation based on scores
 */
function generateTradingRecommendation(
  riskScore: number,
  potentialScore: number,
  riskFactors: RiskFactor[],
  potentialSignals: PotentialSignal[],
  input: ScoringInput
): TradingRecommendation {
  const hasCriticalRisk = riskFactors.some(f => f.severity === 'critical');
  const hasStrongSignals = potentialSignals.filter(s => s.strength === 'strong').length >= 2;
  const riskReward = calculateRiskRewardRatio(riskScore, potentialScore);

  // AVOID - Critical risks or terrible risk/reward
  if (hasCriticalRisk || riskScore >= 80 || (riskScore >= 60 && potentialScore < 30)) {
    return {
      action: 'AVOID',
      reasoning: hasCriticalRisk 
        ? `Critical red flags detected: ${riskFactors.filter(f => f.severity === 'critical').map(f => f.name).join(', ')}`
        : 'Risk/reward ratio is unfavorable - too many warning signs',
      suggestedSizePercent: 0,
      entryStrategy: 'Do not enter this trade',
      exitStrategy: 'N/A',
      timeHorizon: 'N/A',
    };
  }

  // HIGH_RISK_SMALL_SIZE - High risk but some potential
  if (riskScore >= 60 || (riskScore >= 40 && potentialScore < 40)) {
    return {
      action: 'HIGH_RISK_SMALL_SIZE',
      reasoning: `High risk profile (${riskScore}/100) with ${potentialScore < 50 ? 'limited' : 'some'} upside potential`,
      suggestedSizePercent: 10,
      entryStrategy: 'If entering, use 10% of normal size. Wait for a pullback rather than chasing.',
      exitStrategy: 'Set tight stop loss (-20%). Take profits early at 2x.',
      timeHorizon: 'Hours to 1 day maximum',
    };
  }

  // MODERATE_RISK - Balanced setup
  if (riskScore >= 30 || potentialScore < 60) {
    return {
      action: 'MODERATE_RISK',
      reasoning: `Balanced risk/reward. Risk at ${riskScore}/100 with potential at ${potentialScore}/100.`,
      suggestedSizePercent: 25,
      entryStrategy: 'Can enter at 25% size. DCA if conviction is high.',
      exitStrategy: 'Stop loss at -30%. Take partial profits at 2-3x, let rest ride.',
      timeHorizon: '1-3 days',
    };
  }

  // FAVORABLE - Good setup
  if (riskScore < 30 && potentialScore >= 60) {
    return {
      action: 'FAVORABLE',
      reasoning: `Low risk (${riskScore}/100) with good potential (${potentialScore}/100). ${hasStrongSignals ? 'Multiple bullish signals aligned.' : ''}`,
      suggestedSizePercent: 50,
      entryStrategy: 'Can enter at 50% size. Good risk/reward for a meme coin.',
      exitStrategy: 'Stop loss at -35%. Take profits in tranches: 25% at 2x, 25% at 3x, let 50% ride.',
      timeHorizon: '1-7 days',
    };
  }

  // STRONG_SETUP - Excellent opportunity
  return {
    action: 'STRONG_SETUP',
    reasoning: `Low risk (${riskScore}/100) combined with high potential (${potentialScore}/100). Strong signals: ${potentialSignals.filter(s => s.strength === 'strong').map(s => s.name).join(', ')}`,
    suggestedSizePercent: 75,
    entryStrategy: 'Can enter at 75% size. Consider scaling in over 2-3 buys.',
    exitStrategy: 'Stop loss at -40%. Target 3-5x minimum. Hold runners.',
    timeHorizon: '1-14 days',
  };
}

// ============================================================================
// VERDICT GENERATION
// ============================================================================

/**
 * Generate comprehensive verdict
 */
export function generateVerdict(
  scoringResult: ScoringResult,
  input: ScoringInput
): {
  headline: string;
  emoji: string;
  shortSummary: string;
  detailedVerdict: string;
  keyPoints: string[];
  callToAction: string;
} {
  const { riskScore, potentialScore, riskLevel, potentialLevel, tradingRecommendation, riskFactors, potentialSignals } = scoringResult;
  const token = input.token || input.pumpFunData?.token;

  // Determine emoji
  let emoji: string;
  switch (tradingRecommendation.action) {
    case 'AVOID': emoji = '🚨'; break;
    case 'HIGH_RISK_SMALL_SIZE': emoji = '⚠️'; break;
    case 'MODERATE_RISK': emoji = '🟡'; break;
    case 'FAVORABLE': emoji = '🟢'; break;
    case 'STRONG_SETUP': emoji = '🚀'; break;
    default: emoji = '🔵';
  }

  // Generate headline
  const headline = generateHeadline(riskScore, potentialScore, tradingRecommendation.action);

  // Generate short summary
  const shortSummary = `Risk ${riskScore}/100 • Potential ${potentialScore}/100 • ${tradingRecommendation.action.replace(/_/g, ' ')}`;

  // Generate detailed verdict
  const detailedVerdict = generateDetailedVerdict(scoringResult, input);

  // Key points (top 3 risks + top 3 opportunities)
  const keyPoints: string[] = [];
  
  // Top risks
  const topRisks = riskFactors
    .sort((a, b) => b.points - a.points)
    .slice(0, 3);
  topRisks.forEach(r => keyPoints.push(`⚠️ ${r.description}`));

  // Top opportunities
  const topOpportunities = potentialSignals
    .sort((a, b) => b.points - a.points)
    .slice(0, 3);
  topOpportunities.forEach(o => keyPoints.push(`✅ ${o.description}`));

  // Call to action
  const callToAction = generateCallToAction(tradingRecommendation, input);

  return {
    headline,
    emoji,
    shortSummary,
    detailedVerdict,
    keyPoints,
    callToAction,
  };
}

/**
 * Generate headline based on scores
 */
function generateHeadline(riskScore: number, potentialScore: number, action: string): string {
  if (action === 'AVOID') {
    return riskScore >= 80 ? 'Stay Far Away From This One' : 'Too Risky, Skip It';
  }
  if (action === 'HIGH_RISK_SMALL_SIZE') {
    return potentialScore >= 50 ? 'High Risk Gamble - Tiny Size Only' : 'Sketchy Setup - Not Worth It';
  }
  if (action === 'MODERATE_RISK') {
    return 'Decent Setup With Caveats';
  }
  if (action === 'FAVORABLE') {
    return 'Good Risk/Reward Opportunity';
  }
  if (action === 'STRONG_SETUP') {
    return 'Strong Setup - Multiple Bullish Signals';
  }
  return 'Analysis Complete';
}

/**
 * Generate detailed verdict text
 */
function generateDetailedVerdict(scoringResult: ScoringResult, input: ScoringInput): string {
  const { riskScore, potentialScore, riskFactors, potentialSignals, tradingRecommendation } = scoringResult;
  const token = input.token || input.pumpFunData?.token;

  let verdict = '';

  // Opening based on recommendation
  switch (tradingRecommendation.action) {
    case 'AVOID':
      verdict = `Honestly? I'd stay away from this one. `;
      const criticalIssues = riskFactors.filter(f => f.severity === 'critical');
      if (criticalIssues.length > 0) {
        verdict += `There are ${criticalIssues.length} critical red flags that make this extremely risky: `;
        verdict += criticalIssues.map(f => f.name.toLowerCase()).join(', ') + '. ';
      } else {
        verdict += `The overall risk profile at ${riskScore}/100 is too high for the ${potentialScore}/100 potential upside. `;
      }
      verdict += `The risk/reward here just doesn't make sense.`;
      break;

    case 'HIGH_RISK_SMALL_SIZE':
      verdict = `This is a high-risk play. `;
      verdict += `Risk score is ${riskScore}/100 with potential at ${potentialScore}/100. `;
      const topRisks = riskFactors.slice(0, 2).map(f => f.description.toLowerCase()).join(', ');
      verdict += `Main concerns: ${topRisks}. `;
      if (potentialScore >= 50) {
        verdict += `There's some upside potential, but only if you're comfortable potentially losing everything. `;
        verdict += `If you're going to play this, use tiny size (10% max) and have an exit plan.`;
      } else {
        verdict += `The upside isn't compelling enough to justify the risk.`;
      }
      break;

    case 'MODERATE_RISK':
      verdict = `Mixed signals on this one. `;
      const positives = potentialSignals.slice(0, 2).map(s => s.description.toLowerCase()).join(', ');
      const negatives = riskFactors.slice(0, 2).map(f => f.description.toLowerCase()).join(', ');
      verdict += `On the positive side: ${positives || 'some decent metrics'}. `;
      verdict += `Watch out for: ${negatives || 'standard meme coin risks'}. `;
      verdict += `Could work if you're comfortable with the risk profile and size appropriately.`;
      break;

    case 'FAVORABLE':
      verdict = `This looks pretty solid for a meme coin. `;
      verdict += `Risk is manageable at ${riskScore}/100 with good potential at ${potentialScore}/100. `;
      const strongPoints = potentialSignals.filter(s => s.strength === 'strong').slice(0, 2);
      if (strongPoints.length > 0) {
        verdict += `Strong points: ${strongPoints.map(s => s.description.toLowerCase()).join(', ')}. `;
      }
      if (riskFactors.length > 0) {
        verdict += `Just keep an eye on ${riskFactors[0].description.toLowerCase()}. `;
      }
      verdict += `Good risk/reward setup here.`;
      break;

    case 'STRONG_SETUP':
      verdict = `This is actually a strong setup. `;
      verdict += `Low risk at ${riskScore}/100 combined with high potential at ${potentialScore}/100. `;
      const bullishSignals = potentialSignals.filter(s => s.strength === 'strong');
      verdict += `Multiple bullish signals aligned: ${bullishSignals.map(s => s.name.toLowerCase()).join(', ')}. `;
      verdict += `This is one of the better setups I've seen. Size accordingly.`;
      break;
  }

  return verdict;
}

/**
 * Generate call to action
 */
function generateCallToAction(rec: TradingRecommendation, input: ScoringInput): string {
  const token = input.token || input.pumpFunData?.token;
  const symbol = token?.symbol || 'this token';

  switch (rec.action) {
    case 'AVOID':
      return `Skip ${symbol} and look for better opportunities. What's your usual criteria for entries?`;
    case 'HIGH_RISK_SMALL_SIZE':
      return `If you must play ${symbol}, keep it to 10% of your usual size. What's your risk tolerance like?`;
    case 'MODERATE_RISK':
      return `${symbol} could work at 25% size. Would you like me to set up a price alert?`;
    case 'FAVORABLE':
      return `${symbol} looks good for a 50% position. Want me to watch for any red flags?`;
    case 'STRONG_SETUP':
      return `${symbol} is a strong setup. Are you planning to enter, or want to wait for a dip?`;
    default:
      return `What's your take on ${symbol}?`;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) return 'extreme';
  if (score >= 60) return 'very_high';
  if (score >= 40) return 'high';
  if (score >= 20) return 'medium';
  return 'low';
}

function getPotentialLevel(score: number): PotentialLevel {
  if (score >= 80) return 'exceptional';
  if (score >= 60) return 'high';
  if (score >= 40) return 'good';
  if (score >= 20) return 'moderate';
  return 'low';
}

function calculateRiskRewardRatio(riskScore: number, potentialScore: number): number {
  // Higher potential and lower risk = better ratio
  // Ratio > 1 means favorable
  if (riskScore === 0) return potentialScore > 0 ? 10 : 1;
  return (100 - riskScore + potentialScore) / (riskScore + (100 - potentialScore));
}

function calculateConfidenceLevel(input: ScoringInput): number {
  let confidence = 50; // Base confidence

  // More data sources = higher confidence
  if (input.token) confidence += 15;
  if (input.pumpFunData?.token) confidence += 15;
  if (input.holderDistribution) confidence += 10;
  if (input.enhancedDexData) confidence += 5;
  if (input.securityData) confidence += 10;

  // Cap at 95 (never 100% confident in meme coins)
  return Math.min(95, confidence);
}

function createRiskFactor(
  id: string,
  name: string,
  severity: 'critical' | 'high' | 'medium' | 'low',
  points: number,
  description: string,
  source: string
): RiskFactor {
  return { id, name, severity, points, description, source };
}

function createPotentialSignal(
  id: string,
  name: string,
  strength: 'strong' | 'moderate' | 'weak',
  points: number,
  description: string,
  source: string
): PotentialSignal {
  return { id, name, strength, points, description, source };
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(0);
}

// ============================================================================
// EXPORTS
// ============================================================================

export const memeCoinScoringEngine = {
  calculateScore,
  generateVerdict,
  getRiskLevel,
  getPotentialLevel,
};

export default memeCoinScoringEngine;
