/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🚀 MEME COIN INTELLIGENCE SERVICE - Divine Perfection v4.0                ║
 * ║                                                                               ║
 * ║   The ultimate new coin analysis engine for trenchers and meme coin traders. ║
 * ║   Analyzes pump.fun, Raydium, and any DEX token by contract address.         ║
 * ║                                                                               ║
 * ║   CAPABILITIES:                                                               ║
 * ║   • Contract address lookup via DexScreener                                  ║
 * ║   • Scam detection (honeypot, rugpull, mint functions)                       ║
 * ║   • Advanced risk scoring with weighted categories                           ║
 * ║   • Potential scoring with momentum analysis                                  ║
 * ║   • Smart money tracking via Birdeye                                          ║
 * ║   • Twitter/X social mentions                                                 ║
 * ║   • RugCheck security verification                                            ║
 * ║   • Outcome-based scoring calibration                                         ║
 * ║                                                                               ║
 * ║   DATA SOURCES (v4.0):                                                        ║
 * ║   • DexScreener (price, liquidity, volume, age) ✅                           ║
 * ║   • Pump.fun API (bonding curve, replies, creator) ✅                        ║
 * ║   • Solscan API (holder distribution, top wallets) ✅                        ║
 * ║   • Birdeye API (smart money tracking) ✅                                     ║
 * ║   • Twitter/X API (social mentions) ✅                                        ║
 * ║   • RugCheck API (security analysis) ✅                                       ║
 * ║   • Scoring Calibration (outcome tracking) ✅                                 ║
 * ║                                                                               ║
 * ║   @version 4.0.0 - Enhanced with smart money, social, and security data      ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../utils/logger';
import { 
  searchToken, 
  getTokenPairs, 
  analyzeTokenRisk, 
  DexToken, 
  DexPair,
  getEnhancedTokenData,
  EnhancedDexToken,
  buildMemeCoinContext as buildDexContext,
} from './dexscreener';
import { 
  ChainType, 
  DetectedContractAddress,
  AddressSource 
} from './symbol-detector';
import {
  pumpFunApi,
  PumpFunToken,
  PumpFunAnalysis,
  buildPumpFunContext,
  isPumpFunAddress,
} from './pump-fun-api';
import {
  solscanApi,
  HolderDistribution,
  buildHolderContext,
} from './solscan-api';
import {
  memeCoinScoringEngine,
  ScoringResult,
  ScoringInput,
  TradingRecommendation,
  RiskBreakdown,
  PotentialBreakdown,
} from './meme-coin-scoring-engine';
// 🆕 Phase 5 imports
import {
  birdeyeApi,
  SmartMoneyAnalysis,
  buildSmartMoneyContext,
} from './birdeye-api';
import {
  twitterSearchApi,
  TwitterSearchResult,
  buildTwitterContext,
} from './twitter-search-api';
import {
  rugcheckApi,
  RugCheckAnalysis,
  buildRugCheckContext,
} from './rugcheck-api';
import {
  scoringCalibration,
  trackPrediction,
} from './scoring-calibration';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Risk levels for new coin analysis
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'very_high' | 'extreme';
export type PotentialLevel = 'low' | 'moderate' | 'good' | 'high' | 'exceptional';

/**
 * Individual risk factor detected
 */
export interface RiskFactor {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  points: number;
  description: string;
  source: string;
}

/**
 * Individual potential signal detected
 */
export interface PotentialSignal {
  id: string;
  name: string;
  strength: 'strong' | 'moderate' | 'weak';
  points: number;
  description: string;
  source: string;
}

/**
 * Security scan results from GoPlus or similar
 */
export interface SecurityScan {
  isHoneypot: boolean;
  isMintable: boolean;
  hasProxy: boolean;
  hasBlacklist: boolean;
  canTakeBackOwnership: boolean;
  buyTax: number;
  sellTax: number;
  isOpenSource: boolean;
  holderCount: number;
  lpHolderCount: number;
  creatorBalance: number;
  creatorPercent: number;
  top10HoldersPercent: number;
  isLiquidityLocked: boolean;
  scanSource: string;
  scanTimestamp: Date;
}

/**
 * Token basic info from DEX
 */
export interface TokenInfo {
  symbol: string;
  name: string;
  address: string;
  chain: ChainType;
  priceUsd: number;
  priceChange5m: number;
  priceChange1h: number;
  priceChange24h: number;
  marketCap: number;
  fdv: number;
  liquidity: number;
  volume24h: number;
  volume1h: number;
  buys24h: number;
  sells24h: number;
  buysSells24hRatio: number;
  pairAge: number;  // Hours since creation
  pairCreatedAt: Date | null;
  dex: string;
  pairAddress: string;
  pairUrl: string;
  hasWebsite: boolean;
  hasSocials: boolean;
  isVerified: boolean;
}

/**
 * Price range estimate
 */
export interface PriceRange {
  current: number;
  downside: {
    price: number;
    percentChange: number;
    scenario: string;
  };
  base: {
    priceMin: number;
    priceMax: number;
    scenario: string;
  };
  upside: {
    price: number;
    percentChange: number;
    scenario: string;
  };
}

/**
 * Complete meme coin analysis result
 */
export interface MemeCoinAnalysis {
  // Core identification
  address: string;
  chain: ChainType;
  source: AddressSource;
  
  // Token data
  token: TokenInfo | null;
  
  // 🆕 Enhanced data sources (Phase 2-3)
  pumpFunData: PumpFunAnalysis | null;      // Pump.fun specific data
  holderDistribution: HolderDistribution | null;  // Solscan holder data
  enhancedDexData: EnhancedDexToken | null; // Enhanced DexScreener data
  
  // 🆕 Phase 5 data sources
  smartMoneyData: SmartMoneyAnalysis | null;  // Birdeye smart money
  twitterData: TwitterSearchResult | null;     // Twitter mentions
  rugcheckData: RugCheckAnalysis | null;       // RugCheck security
  
  // Security analysis
  security: SecurityScan | null;
  
  // Scoring
  riskScore: number;           // 0-100, higher = riskier
  riskLevel: RiskLevel;
  riskFactors: RiskFactor[];
  riskBreakdown: RiskBreakdown | null;  // 🆕 Detailed breakdown
  
  potentialScore: number;      // 0-100, higher = more potential
  potentialLevel: PotentialLevel;
  potentialSignals: PotentialSignal[];
  potentialBreakdown: PotentialBreakdown | null;  // 🆕 Detailed breakdown
  
  // 🆕 Trading recommendation
  tradingRecommendation: TradingRecommendation | null;
  riskRewardRatio: number;
  confidenceLevel: number;     // 0-100, how confident is the analysis
  
  // Price estimates
  priceRange: PriceRange | null;
  
  // Verdict
  verdict: string;
  verdictEmoji: string;
  shortSummary: string;
  keyPoints: string[];         // 🆕 Key points for quick scanning
  callToAction: string;        // 🆕 What to do next
  
  // Metadata
  analysisTimestamp: Date;
  dataFreshness: 'live' | 'cached' | 'partial';
  dataSources: string[];
  processingTimeMs: number;
  predictionId?: string;       // 🆕 For outcome tracking
  
  // Raw data for AI context
  rawContext: string;
}

/**
 * Configuration for analysis
 */
export interface AnalysisConfig {
  includeSecurityScan: boolean;
  includePriceRange: boolean;
  maxDataFetchTimeMs: number;
  chain?: ChainType;
}

const DEFAULT_CONFIG: AnalysisConfig = {
  includeSecurityScan: true,
  includePriceRange: true,
  maxDataFetchTimeMs: 5000,
};

// ============================================================================
// RISK SCORING WEIGHTS
// ============================================================================

/**
 * Hard fail conditions - instant high risk
 */
const HARD_FAIL_RISKS: Record<string, { points: number; severity: 'critical' | 'high' }> = {
  honeypot: { points: 50, severity: 'critical' },
  mintable: { points: 40, severity: 'critical' },
  highSellTax: { points: 35, severity: 'high' },
  creatorDumped: { points: 40, severity: 'critical' },
  bundledLaunch: { points: 35, severity: 'high' },
  knownScamWallet: { points: 50, severity: 'critical' },
};

/**
 * Soft fail conditions - cumulative risk
 */
const SOFT_FAIL_RISKS: Record<string, { points: number; severity: 'medium' | 'low' }> = {
  veryNew: { points: 15, severity: 'medium' },       // < 1 hour
  newToken: { points: 8, severity: 'low' },          // < 24 hours
  lowLiquidity: { points: 20, severity: 'medium' },  // < $5K
  mediumLiquidity: { points: 10, severity: 'low' },  // < $20K
  concentratedHolders: { points: 15, severity: 'medium' }, // Top 10 > 50%
  noSocials: { points: 10, severity: 'low' },
  highBuyTax: { points: 8, severity: 'low' },
  fewHolders: { points: 12, severity: 'low' },       // < 50
  suspiciousVolume: { points: 12, severity: 'medium' }, // Vol/Liq > 10
  notOpenSource: { points: 8, severity: 'low' },
  hasBlacklist: { points: 10, severity: 'low' },
  canRevokeOwnership: { points: 12, severity: 'medium' },
};

/**
 * Potential signal weights
 */
const POTENTIAL_SIGNALS: Record<string, { points: number; strength: 'strong' | 'moderate' | 'weak' }> = {
  trending: { points: 20, strength: 'strong' },
  highBuyPressure: { points: 15, strength: 'moderate' },
  smartMoney: { points: 25, strength: 'strong' },
  influencerMentions: { points: 15, strength: 'moderate' },
  strongNarrative: { points: 10, strength: 'weak' },
  devHolding: { points: 10, strength: 'weak' },
  growingHolders: { points: 15, strength: 'moderate' },
  highBondingProgress: { points: 12, strength: 'moderate' },  // pump.fun
  liquidityLocked: { points: 10, strength: 'weak' },
  goodLiquidity: { points: 12, strength: 'moderate' },
  healthyVolume: { points: 10, strength: 'weak' },
  verifiedSocials: { points: 8, strength: 'weak' },
  establishedAge: { points: 10, strength: 'weak' },  // > 7 days
};

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * 🎯 Analyze a meme coin by contract address
 * 
 * This is the main entry point for new coin analysis.
 * Fetches data from multiple sources, calculates risk/potential scores,
 * and generates a comprehensive verdict.
 */
export async function analyzeMemeToken(
  addressInfo: DetectedContractAddress,
  config: Partial<AnalysisConfig> = {}
): Promise<MemeCoinAnalysis> {
  const startTime = performance.now();
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const dataSources: string[] = [];

  logger.info('🚀 Starting meme coin analysis', {
    address: addressInfo.address.slice(0, 8) + '...',
    chain: addressInfo.chain,
    source: addressInfo.source,
  });

  // Initialize result structure
  const result: MemeCoinAnalysis = {
    address: addressInfo.address,
    chain: addressInfo.chain,
    source: addressInfo.source,
    token: null,
    pumpFunData: null,
    holderDistribution: null,
    enhancedDexData: null,
    smartMoneyData: null,      // 🆕 Phase 5
    twitterData: null,          // 🆕 Phase 5
    rugcheckData: null,         // 🆕 Phase 5
    security: null,
    riskScore: 0,
    riskLevel: 'medium',
    riskFactors: [],
    riskBreakdown: null,
    potentialScore: 0,
    potentialLevel: 'low',
    potentialSignals: [],
    potentialBreakdown: null,
    tradingRecommendation: null,
    riskRewardRatio: 0,
    confidenceLevel: 0,
    priceRange: null,
    verdict: '',
    verdictEmoji: '⚠️',
    shortSummary: '',
    keyPoints: [],
    callToAction: '',
    analysisTimestamp: new Date(),
    dataFreshness: 'live',
    dataSources: [],
    processingTimeMs: 0,
    rawContext: '',
  };

  try {
    // ========================================================================
    // PHASE 1: PARALLEL DATA FETCHING FROM ALL SOURCES
    // ========================================================================
    // Determine which APIs to call based on chain and source
    const isPumpFun = addressInfo.isPumpFun || isPumpFunAddress(addressInfo.address);
    const isSolana = addressInfo.chain === 'solana';
    
    logger.debug('🚀 Starting parallel data fetch', {
      isPumpFun,
      isSolana,
      address: addressInfo.address.slice(0, 8),
    });

    // Parallel fetch from all available sources (Phase 2-5)
    const [
      dexResult, 
      enhancedDex, 
      pumpFunResult, 
      holderResult,
      smartMoneyResult,   // 🆕 Phase 5
      twitterResult,      // 🆕 Phase 5
      rugcheckResult,     // 🆕 Phase 5
    ] = await Promise.all([
      // DexScreener basic data
      fetchDexScreenerData(addressInfo.address),
      
      // Enhanced DexScreener data
      getEnhancedTokenData(addressInfo.address).catch(() => null),
      
      // Pump.fun data (only for Solana/pump.fun tokens)
      isPumpFun || isSolana 
        ? pumpFunApi.analyze(addressInfo.address).catch(() => null)
        : Promise.resolve(null),
      
      // Solscan holder data (only for Solana)
      isSolana
        ? solscanApi.analyzeHolderDistribution(addressInfo.address).catch(() => null)
        : Promise.resolve(null),
      
      // 🆕 Birdeye smart money (only for Solana)
      isSolana
        ? birdeyeApi.analyzeSmartMoney(addressInfo.address).catch(() => null)
        : Promise.resolve(null),
      
      // 🆕 Twitter mentions (for all chains)
      twitterSearchApi.searchTokenMentions(
        addressInfo.address.slice(0, 8), // Use truncated address as query
        addressInfo.address
      ).catch(() => null),
      
      // 🆕 RugCheck security (only for Solana)
      isSolana
        ? rugcheckApi.analyzeTokenSecurity(addressInfo.address).catch(() => null)
        : Promise.resolve(null),
    ]);

    // ========================================================================
    // PHASE 1.5: Process fetched data
    // ========================================================================
    
    // DexScreener data
    if (dexResult) {
      result.token = dexResult;
      dataSources.push('DexScreener');
    }
    
    // Enhanced DexScreener
    if (enhancedDex) {
      result.enhancedDexData = enhancedDex;
      // Don't add to dataSources - it's part of DexScreener
    }
    
    // Pump.fun data
    if (pumpFunResult?.token) {
      result.pumpFunData = pumpFunResult;
      dataSources.push('Pump.fun');
      
      // Use pump.fun data to enrich token info if DexScreener didn't find it
      if (!result.token && pumpFunResult.token) {
        result.token = convertPumpFunToTokenInfo(pumpFunResult.token);
      }
    }
    
    // Solscan holder data
    if (holderResult && holderResult.totalHolders > 0) {
      result.holderDistribution = holderResult;
      dataSources.push('Solscan');
    }
    
    // 🆕 Phase 5: Smart money data (Birdeye)
    if (smartMoneyResult) {
      result.smartMoneyData = smartMoneyResult;
      dataSources.push('Birdeye');
      logger.debug('🦅 Smart money data added', {
        signal: smartMoneyResult.overallSignal,
        netFlow: smartMoneyResult.smartMoneyNetFlow,
      });
    }
    
    // 🆕 Phase 5: Twitter data
    if (twitterResult && twitterResult.totalMentions > 0) {
      result.twitterData = twitterResult;
      dataSources.push('Twitter');
      logger.debug('🐦 Twitter data added', {
        mentions: twitterResult.totalMentions,
        sentiment: twitterResult.overallSentiment,
        virality: twitterResult.viralityScore,
      });
    }
    
    // 🆕 Phase 5: RugCheck data
    if (rugcheckResult) {
      result.rugcheckData = rugcheckResult;
      dataSources.push('RugCheck');
      logger.debug('🔍 RugCheck data added', {
        risk: rugcheckResult.overallRisk,
        isHoneypot: rugcheckResult.isHoneypot,
      });
    }
    
    // Check if we have any data at all
    if (!result.token && !result.pumpFunData?.token) {
      result.riskScore = 85;
      result.riskLevel = 'very_high';
      result.riskFactors.push({
        id: 'not_found',
        name: 'Token Not Found',
        severity: 'high',
        points: 30,
        description: 'Token not found on any DEX or pump.fun - may be too new or invalid address',
        source: 'All Sources',
      });
      result.verdict = 'Unable to find this token anywhere. It may be too new (< few minutes old), or the address is invalid.';
      result.verdictEmoji = '❓';
      result.shortSummary = 'Token not found - cannot analyze';
      result.processingTimeMs = performance.now() - startTime;
      result.dataSources = dataSources;
      return result;
    }

    // ========================================================================
    // PHASE 2: Security scan (enhanced with holder data)
    // ========================================================================
    if (cfg.includeSecurityScan && result.token) {
      result.security = await performSecurityScan(
        result.token, 
        addressInfo,
        result.holderDistribution,
        result.pumpFunData
      );
      dataSources.push('SecurityScan');
    }

    // ========================================================================
    // PHASE 3: ADVANCED SCORING ENGINE
    // Uses the new meme-coin-scoring-engine for comprehensive analysis
    // ========================================================================
    const scoringInput: ScoringInput = {
      token: result.token,
      pumpFunData: result.pumpFunData,
      holderDistribution: result.holderDistribution,
      enhancedDexData: result.enhancedDexData,
      securityData: result.security ? {
        isHoneypot: result.security.isHoneypot,
        isMintable: result.security.isMintable,
        hasProxy: result.security.hasProxy,
        hasBlacklist: result.security.hasBlacklist,
        canRevokeOwnership: result.security.canTakeBackOwnership,
        buyTax: result.security.buyTax,
        sellTax: result.security.sellTax,
        isOpenSource: result.security.isOpenSource,
        isLiquidityLocked: result.security.isLiquidityLocked,
      } : null,
    };

    const scoringResult = memeCoinScoringEngine.calculateScore(scoringInput);
    
    // Apply scoring results
    result.riskScore = scoringResult.riskScore;
    result.riskLevel = scoringResult.riskLevel;
    result.riskFactors = scoringResult.riskFactors;
    result.riskBreakdown = scoringResult.riskBreakdown;
    
    result.potentialScore = scoringResult.potentialScore;
    result.potentialLevel = scoringResult.potentialLevel;
    result.potentialSignals = scoringResult.potentialSignals;
    result.potentialBreakdown = scoringResult.potentialBreakdown;
    
    result.tradingRecommendation = scoringResult.tradingRecommendation;
    result.riskRewardRatio = scoringResult.riskRewardRatio;
    result.confidenceLevel = scoringResult.confidenceLevel;

    dataSources.push('ScoringEngine');

    // ========================================================================
    // PHASE 4: Generate price range estimates
    // ========================================================================
    if (cfg.includePriceRange && result.token) {
      result.priceRange = calculatePriceRange(result.token, result.riskScore, result.pumpFunData);
    }

    // ========================================================================
    // PHASE 5: Generate verdict using scoring engine
    // ========================================================================
    const verdictResult = memeCoinScoringEngine.generateVerdict(scoringResult, scoringInput);
    result.verdict = verdictResult.detailedVerdict;
    result.verdictEmoji = verdictResult.emoji;
    result.shortSummary = verdictResult.shortSummary;
    result.keyPoints = verdictResult.keyPoints;
    result.callToAction = verdictResult.callToAction;

    // ========================================================================
    // PHASE 6: Build raw context for AI (comprehensive)
    // ========================================================================
    result.rawContext = buildAIContext(result);

  } catch (error) {
    logger.error('🚀 Meme coin analysis failed', {
      address: addressInfo.address,
      error: error instanceof Error ? error.message : String(error),
    });
    
    result.riskScore = 80;
    result.riskLevel = 'very_high';
    result.verdict = 'Analysis failed due to data fetch error. Exercise extreme caution.';
    result.verdictEmoji = '⚠️';
    result.shortSummary = 'Analysis error - use caution';
    result.keyPoints = ['⚠️ Unable to complete full analysis', '⚠️ Data fetch error occurred'];
    result.callToAction = 'Try again later or verify the address is correct.';
    result.tradingRecommendation = {
      action: 'AVOID',
      reasoning: 'Unable to complete analysis due to data fetch error',
      suggestedSizePercent: 0,
      entryStrategy: 'Do not enter until analysis can be completed',
      exitStrategy: 'N/A',
      timeHorizon: 'N/A',
    };
    result.dataFreshness = 'partial';
  }

  result.processingTimeMs = performance.now() - startTime;
  result.dataSources = dataSources;

  logger.info('🚀 Meme coin analysis complete', {
    address: addressInfo.address.slice(0, 8) + '...',
    riskScore: result.riskScore,
    potentialScore: result.potentialScore,
    verdict: result.shortSummary,
    timeMs: result.processingTimeMs.toFixed(0),
  });

  return result;
}

// ============================================================================
// DATA FETCHING
// ============================================================================

/**
 * Fetch token data from DexScreener
 */
async function fetchDexScreenerData(address: string): Promise<TokenInfo | null> {
  try {
    // Try searching by address
    const pairs = await getTokenPairs(address);
    
    if (!pairs || pairs.length === 0) {
      // Fallback: try search
      const searchResult = await searchToken(address);
      if (searchResult.tokens.length === 0) {
        return null;
      }
      // Convert first token
      const token = searchResult.tokens[0];
      return convertDexTokenToTokenInfo(token);
    }

    // Find best pair (highest liquidity USD pair)
    const bestPair = pairs
      .filter(p => p.priceUsd && parseFloat(p.priceUsd) > 0)
      .sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];

    if (!bestPair) return null;

    return convertDexPairToTokenInfo(bestPair);
  } catch (error) {
    logger.error('Failed to fetch DexScreener data', { address, error });
    return null;
  }
}

/**
 * Convert DexToken to TokenInfo
 */
function convertDexTokenToTokenInfo(token: DexToken): TokenInfo {
  const buysSells = token.txns24h.buys + token.txns24h.sells;
  const ratio = buysSells > 0 ? token.txns24h.buys / buysSells : 0.5;
  
  return {
    symbol: token.symbol,
    name: token.name,
    address: token.address,
    chain: token.chainId as ChainType,
    priceUsd: token.priceUsd,
    priceChange5m: token.priceChange5m || 0,
    priceChange1h: token.priceChange1h || 0,
    priceChange24h: token.priceChange24h,
    marketCap: token.marketCap || token.fdv * 0.5,
    fdv: token.fdv,
    liquidity: token.liquidity,
    volume24h: token.volume24h,
    volume1h: token.volume24h / 24,
    buys24h: token.txns24h.buys,
    sells24h: token.txns24h.sells,
    buysSells24hRatio: ratio,
    pairAge: token.pairCreatedAt 
      ? (Date.now() - token.pairCreatedAt.getTime()) / (1000 * 60 * 60)
      : 9999,
    pairCreatedAt: token.pairCreatedAt || null,
    dex: token.dex,
    pairAddress: token.pairAddress,
    pairUrl: token.pairUrl,
    hasWebsite: token.isVerified,
    hasSocials: token.isVerified,
    isVerified: token.isVerified,
  };
}

/**
 * Convert DexPair to TokenInfo
 */
function convertDexPairToTokenInfo(pair: DexPair): TokenInfo {
  const totalTxns = (pair.txns?.h24?.buys || 0) + (pair.txns?.h24?.sells || 0);
  const ratio = totalTxns > 0 ? (pair.txns?.h24?.buys || 0) / totalTxns : 0.5;
  
  const pairAge = pair.pairCreatedAt 
    ? (Date.now() - pair.pairCreatedAt) / (1000 * 60 * 60)
    : 9999;

  return {
    symbol: pair.baseToken.symbol.toUpperCase(),
    name: pair.baseToken.name,
    address: pair.baseToken.address,
    chain: pair.chainId as ChainType,
    priceUsd: parseFloat(pair.priceUsd) || 0,
    priceChange5m: pair.priceChange?.m5 || 0,
    priceChange1h: pair.priceChange?.h1 || 0,
    priceChange24h: pair.priceChange?.h24 || 0,
    marketCap: pair.marketCap || pair.fdv * 0.5,
    fdv: pair.fdv || 0,
    liquidity: pair.liquidity?.usd || 0,
    volume24h: pair.volume?.h24 || 0,
    volume1h: pair.volume?.h1 || 0,
    buys24h: pair.txns?.h24?.buys || 0,
    sells24h: pair.txns?.h24?.sells || 0,
    buysSells24hRatio: ratio,
    pairAge,
    pairCreatedAt: pair.pairCreatedAt ? new Date(pair.pairCreatedAt) : null,
    dex: pair.dexId,
    pairAddress: pair.pairAddress,
    pairUrl: pair.url,
    hasWebsite: !!(pair.info?.websites?.length),
    hasSocials: !!(pair.info?.socials?.length),
    isVerified: !!(pair.info?.websites?.length || pair.info?.socials?.length),
  };
}

/**
 * 🆕 Convert Pump.fun token data to TokenInfo
 */
function convertPumpFunToTokenInfo(pumpToken: PumpFunToken): TokenInfo {
  return {
    symbol: pumpToken.symbol,
    name: pumpToken.name,
    address: pumpToken.mint,
    chain: 'solana',
    priceUsd: pumpToken.priceUsd,
    priceChange5m: 0, // Not available from pump.fun directly
    priceChange1h: 0,
    priceChange24h: 0,
    marketCap: pumpToken.marketCapUsd,
    fdv: pumpToken.marketCapUsd, // Same for pump.fun tokens
    liquidity: pumpToken.liquidityEstimateUsd,
    volume24h: 0, // Would need to calculate from trades
    volume1h: 0,
    buys24h: 0,
    sells24h: 0,
    buysSells24hRatio: 0.5,
    pairAge: pumpToken.ageHours,
    pairCreatedAt: pumpToken.createdAt,
    dex: pumpToken.isGraduated ? 'raydium' : 'pump.fun',
    pairAddress: pumpToken.bondingCurveAddress,
    pairUrl: `https://pump.fun/${pumpToken.mint}`,
    hasWebsite: !!pumpToken.website,
    hasSocials: pumpToken.hasSocials,
    isVerified: pumpToken.hasSocials,
  };
}

/**
 * Perform security scan using available data
 * Enhanced with holder distribution and pump.fun data
 */
async function performSecurityScan(
  token: TokenInfo,
  addressInfo: DetectedContractAddress,
  holderData?: HolderDistribution | null,
  pumpFunData?: PumpFunAnalysis | null
): Promise<SecurityScan> {
  // TODO: Integrate GoPlus Security API for real honeypot detection
  // For now, derive what we can from all available data sources
  
  const dexRisk = analyzeTokenRisk({
    symbol: token.symbol,
    name: token.name,
    address: token.address,
    chainId: token.chain,
    priceUsd: token.priceUsd,
    priceChange24h: token.priceChange24h,
    priceChange1h: token.priceChange1h,
    priceChange5m: token.priceChange5m,
    volume24h: token.volume24h,
    liquidity: token.liquidity,
    fdv: token.fdv,
    txns24h: { buys: token.buys24h, sells: token.sells24h },
    dex: token.dex,
    pairAddress: token.pairAddress,
    pairUrl: token.pairUrl,
    quoteToken: 'USD',
    isVerified: token.isVerified,
    confidence: 0.8,
    source: 'dexscreener',
  });

  // Extract holder metrics if available
  const holderCount = holderData?.totalHolders || 0;
  const top10Percent = holderData?.top10Percent || 0;
  const creatorPercent = holderData?.creatorPercent || pumpFunData?.creatorSellPercent || 0;
  
  // Check if creator is selling (from pump.fun data)
  const isCreatorSelling = pumpFunData?.isCreatorSelling || false;

  // Build sources list
  const sources: string[] = ['DexScreener'];
  if (holderData) sources.push('Solscan');
  if (pumpFunData) sources.push('Pump.fun');

  return {
    isHoneypot: false, // Would need GoPlus to detect
    isMintable: false, // Would need contract analysis
    hasProxy: false,
    hasBlacklist: false,
    canTakeBackOwnership: false,
    buyTax: 0,
    sellTax: 0,
    isOpenSource: true, // Assume true, would need verification
    holderCount,
    lpHolderCount: holderData?.lpAddresses.length || 0,
    creatorBalance: 0,
    creatorPercent,
    top10HoldersPercent: top10Percent,
    isLiquidityLocked: false, // Would need contract analysis
    scanSource: sources.join('+'),
    scanTimestamp: new Date(),
  };
}

// ============================================================================
// SCORING CALCULATIONS
// ============================================================================

/**
 * Calculate risk score (0-100)
 * Enhanced with pump.fun and holder distribution data
 */
function calculateRiskScore(
  token: TokenInfo | null,
  security: SecurityScan | null,
  pumpFunData?: PumpFunAnalysis | null,
  holderData?: HolderDistribution | null
): { score: number; factors: RiskFactor[] } {
  const factors: RiskFactor[] = [];
  let score = 0;

  if (!token) {
    return { score: 90, factors: [{ 
      id: 'no_data', 
      name: 'No Data', 
      severity: 'critical', 
      points: 40,
      description: 'Unable to fetch token data',
      source: 'system'
    }]};
  }

  // === HARD FAILS ===
  
  // Honeypot check (if security data available)
  if (security?.isHoneypot) {
    factors.push({
      id: 'honeypot',
      name: 'Honeypot Detected',
      severity: 'critical',
      points: HARD_FAIL_RISKS.honeypot.points,
      description: 'Contract prevents selling - SCAM',
      source: 'SecurityScan',
    });
    score += HARD_FAIL_RISKS.honeypot.points;
  }

  // Mintable check
  if (security?.isMintable) {
    factors.push({
      id: 'mintable',
      name: 'Mintable Token',
      severity: 'critical',
      points: HARD_FAIL_RISKS.mintable.points,
      description: 'Owner can mint unlimited tokens - extreme rug risk',
      source: 'SecurityScan',
    });
    score += HARD_FAIL_RISKS.mintable.points;
  }

  // High sell tax
  if (security && security.sellTax > 10) {
    factors.push({
      id: 'high_sell_tax',
      name: 'High Sell Tax',
      severity: 'high',
      points: HARD_FAIL_RISKS.highSellTax.points,
      description: `${security.sellTax}% sell tax - difficult to exit`,
      source: 'SecurityScan',
    });
    score += HARD_FAIL_RISKS.highSellTax.points;
  }

  // 🆕 Creator dumping (from pump.fun data)
  if (pumpFunData?.isCreatorSelling && pumpFunData.creatorSellPercent > 10) {
    factors.push({
      id: 'creator_dumping',
      name: 'Creator Selling',
      severity: 'critical',
      points: HARD_FAIL_RISKS.creatorDumped.points,
      description: `Creator has sold ${pumpFunData.creatorSellPercent.toFixed(1)}% of supply`,
      source: 'Pump.fun',
    });
    score += HARD_FAIL_RISKS.creatorDumped.points;
  }

  // === SOFT FAILS ===

  // Very new token (< 1 hour)
  if (token.pairAge < 1) {
    factors.push({
      id: 'very_new',
      name: 'Extremely New',
      severity: 'medium',
      points: SOFT_FAIL_RISKS.veryNew.points,
      description: `Only ${Math.round(token.pairAge * 60)} minutes old - maximum volatility`,
      source: 'DexScreener',
    });
    score += SOFT_FAIL_RISKS.veryNew.points;
  } else if (token.pairAge < 24) {
    factors.push({
      id: 'new_token',
      name: 'New Token',
      severity: 'low',
      points: SOFT_FAIL_RISKS.newToken.points,
      description: `${Math.round(token.pairAge)} hours old - high volatility expected`,
      source: 'DexScreener',
    });
    score += SOFT_FAIL_RISKS.newToken.points;
  }

  // Low liquidity
  if (token.liquidity < 5000) {
    factors.push({
      id: 'low_liquidity',
      name: 'Very Low Liquidity',
      severity: 'medium',
      points: SOFT_FAIL_RISKS.lowLiquidity.points,
      description: `Only $${formatNumber(token.liquidity)} liquidity - extreme slippage`,
      source: 'DexScreener',
    });
    score += SOFT_FAIL_RISKS.lowLiquidity.points;
  } else if (token.liquidity < 20000) {
    factors.push({
      id: 'medium_liquidity',
      name: 'Low Liquidity',
      severity: 'low',
      points: SOFT_FAIL_RISKS.mediumLiquidity.points,
      description: `$${formatNumber(token.liquidity)} liquidity - slippage risk on larger trades`,
      source: 'DexScreener',
    });
    score += SOFT_FAIL_RISKS.mediumLiquidity.points;
  }

  // No socials/verification
  if (!token.isVerified) {
    factors.push({
      id: 'no_socials',
      name: 'Unverified Token',
      severity: 'low',
      points: SOFT_FAIL_RISKS.noSocials.points,
      description: 'No verified website or social links',
      source: 'DexScreener',
    });
    score += SOFT_FAIL_RISKS.noSocials.points;
  }

  // Suspicious volume/liquidity ratio
  if (token.liquidity > 0 && token.volume24h / token.liquidity > 10) {
    factors.push({
      id: 'suspicious_volume',
      name: 'Unusual Volume',
      severity: 'medium',
      points: SOFT_FAIL_RISKS.suspiciousVolume.points,
      description: `Volume/Liquidity ratio of ${(token.volume24h / token.liquidity).toFixed(1)}x - possible wash trading`,
      source: 'DexScreener',
    });
    score += SOFT_FAIL_RISKS.suspiciousVolume.points;
  }

  // Heavy sell pressure
  if (token.buysSells24hRatio < 0.35) {
    factors.push({
      id: 'sell_pressure',
      name: 'Heavy Sell Pressure',
      severity: 'medium',
      points: 12,
      description: `Only ${(token.buysSells24hRatio * 100).toFixed(0)}% of transactions are buys`,
      source: 'DexScreener',
    });
    score += 12;
  }

  // 🆕 Holder concentration (from Solscan data)
  if (holderData) {
    if (holderData.concentrationRisk === 'extreme') {
      factors.push({
        id: 'extreme_concentration',
        name: 'Extreme Holder Concentration',
        severity: 'high',
        points: 20,
        description: `Top 10 holders own ${holderData.top10Percent.toFixed(0)}% of supply`,
        source: 'Solscan',
      });
      score += 20;
    } else if (holderData.concentrationRisk === 'high') {
      factors.push({
        id: 'high_concentration',
        name: 'High Holder Concentration',
        severity: 'medium',
        points: 12,
        description: `Top 10 holders own ${holderData.top10Percent.toFixed(0)}% of supply`,
        source: 'Solscan',
      });
      score += 12;
    }
    
    // Few holders
    if (holderData.totalHolders < 50) {
      factors.push({
        id: 'few_holders',
        name: 'Very Few Holders',
        severity: 'medium',
        points: SOFT_FAIL_RISKS.fewHolders.points,
        description: `Only ${holderData.totalHolders} holders`,
        source: 'Solscan',
      });
      score += SOFT_FAIL_RISKS.fewHolders.points;
    }
  }

  // 🆕 Pump.fun specific risks
  if (pumpFunData?.token) {
    // Token too new (under 30 minutes)
    if (pumpFunData.token.ageMinutes < 30) {
      factors.push({
        id: 'extremely_new',
        name: 'Extremely New Token',
        severity: 'high',
        points: 18,
        description: `Only ${Math.round(pumpFunData.token.ageMinutes)} minutes old - maximum risk`,
        source: 'Pump.fun',
      });
      score += 18;
    }
    
    // Low bonding curve progress (early = risky)
    if (pumpFunData.token.bondingCurveProgress < 20 && !pumpFunData.token.isGraduated) {
      factors.push({
        id: 'low_bonding',
        name: 'Low Bonding Progress',
        severity: 'medium',
        points: 10,
        description: `Only ${pumpFunData.token.bondingCurveProgress.toFixed(0)}% bonding curve - very early stage`,
        source: 'Pump.fun',
      });
      score += 10;
    }
    
    // No community engagement
    if (pumpFunData.token.replyCount < 5) {
      factors.push({
        id: 'no_engagement',
        name: 'No Community Engagement',
        severity: 'low',
        points: 8,
        description: `Only ${pumpFunData.token.replyCount} replies on pump.fun`,
        source: 'Pump.fun',
      });
      score += 8;
    }
  }

  // Cap at 100
  score = Math.min(100, score);

  return { score, factors };
}

/**
 * Calculate potential score (0-100)
 * Enhanced with pump.fun and holder distribution data
 */
function calculatePotentialScore(
  token: TokenInfo | null,
  security: SecurityScan | null,
  pumpFunData?: PumpFunAnalysis | null,
  holderData?: HolderDistribution | null
): { score: number; signals: PotentialSignal[] } {
  const signals: PotentialSignal[] = [];
  let score = 0;

  if (!token) {
    return { score: 0, signals: [] };
  }

  // Strong buy pressure
  if (token.buysSells24hRatio > 0.65) {
    signals.push({
      id: 'high_buy_pressure',
      name: 'Strong Buy Pressure',
      strength: 'moderate',
      points: POTENTIAL_SIGNALS.highBuyPressure.points,
      description: `${(token.buysSells24hRatio * 100).toFixed(0)}% of transactions are buys`,
      source: 'DexScreener',
    });
    score += POTENTIAL_SIGNALS.highBuyPressure.points;
  }

  // Good liquidity
  if (token.liquidity >= 50000) {
    signals.push({
      id: 'good_liquidity',
      name: 'Good Liquidity',
      strength: 'moderate',
      points: POTENTIAL_SIGNALS.goodLiquidity.points,
      description: `$${formatNumber(token.liquidity)} liquidity - reasonable depth`,
      source: 'DexScreener',
    });
    score += POTENTIAL_SIGNALS.goodLiquidity.points;
  }

  // Healthy volume
  if (token.volume24h >= 100000) {
    signals.push({
      id: 'healthy_volume',
      name: 'Active Trading',
      strength: 'weak',
      points: POTENTIAL_SIGNALS.healthyVolume.points,
      description: `$${formatNumber(token.volume24h)} 24h volume - active interest`,
      source: 'DexScreener',
    });
    score += POTENTIAL_SIGNALS.healthyVolume.points;
  }

  // Verified socials
  if (token.isVerified) {
    signals.push({
      id: 'verified_socials',
      name: 'Verified Links',
      strength: 'weak',
      points: POTENTIAL_SIGNALS.verifiedSocials.points,
      description: 'Has verified website/social links',
      source: 'DexScreener',
    });
    score += POTENTIAL_SIGNALS.verifiedSocials.points;
  }

  // Established age (survived > 7 days)
  if (token.pairAge > 168) { // 7 days in hours
    signals.push({
      id: 'established',
      name: 'Established Token',
      strength: 'weak',
      points: POTENTIAL_SIGNALS.establishedAge.points,
      description: `${Math.floor(token.pairAge / 24)} days old - survived initial volatility`,
      source: 'DexScreener',
    });
    score += POTENTIAL_SIGNALS.establishedAge.points;
  }

  // Positive momentum
  if (token.priceChange1h > 10 && token.priceChange24h > 0) {
    signals.push({
      id: 'momentum',
      name: 'Positive Momentum',
      strength: 'moderate',
      points: 12,
      description: `+${token.priceChange1h.toFixed(0)}% in last hour`,
      source: 'DexScreener',
    });
    score += 12;
  }

  // Low market cap (room to grow)
  if (token.marketCap > 0 && token.marketCap < 500000) {
    signals.push({
      id: 'low_mcap',
      name: 'Low Market Cap',
      strength: 'moderate',
      points: 10,
      description: `$${formatNumber(token.marketCap)} market cap - room for growth`,
      source: 'DexScreener',
    });
    score += 10;
  }

  // 🆕 Pump.fun specific potential signals
  if (pumpFunData?.token) {
    // High bonding curve progress (close to graduation)
    if (pumpFunData.token.bondingCurveProgress >= 70 && !pumpFunData.token.isGraduated) {
      signals.push({
        id: 'high_bonding',
        name: 'Near Graduation',
        strength: 'strong',
        points: POTENTIAL_SIGNALS.highBondingProgress.points + 8,
        description: `${pumpFunData.token.bondingCurveProgress.toFixed(0)}% bonding curve - close to Raydium graduation`,
        source: 'Pump.fun',
      });
      score += POTENTIAL_SIGNALS.highBondingProgress.points + 8;
    } else if (pumpFunData.token.bondingCurveProgress >= 50) {
      signals.push({
        id: 'good_bonding',
        name: 'Good Bonding Progress',
        strength: 'moderate',
        points: POTENTIAL_SIGNALS.highBondingProgress.points,
        description: `${pumpFunData.token.bondingCurveProgress.toFixed(0)}% bonding curve progress`,
        source: 'Pump.fun',
      });
      score += POTENTIAL_SIGNALS.highBondingProgress.points;
    }
    
    // Already graduated to Raydium
    if (pumpFunData.token.isGraduated) {
      signals.push({
        id: 'graduated',
        name: 'Graduated to Raydium',
        strength: 'moderate',
        points: 15,
        description: 'Successfully graduated from pump.fun bonding curve',
        source: 'Pump.fun',
      });
      score += 15;
    }
    
    // King of the Hill
    if (pumpFunData.token.isKingOfTheHill) {
      signals.push({
        id: 'koth',
        name: 'King of the Hill',
        strength: 'strong',
        points: POTENTIAL_SIGNALS.trending.points,
        description: 'Currently trending on pump.fun',
        source: 'Pump.fun',
      });
      score += POTENTIAL_SIGNALS.trending.points;
    }
    
    // Strong community engagement
    if (pumpFunData.token.replyCount >= 50) {
      signals.push({
        id: 'high_engagement',
        name: 'Active Community',
        strength: 'moderate',
        points: 12,
        description: `${pumpFunData.token.replyCount} replies - active community discussion`,
        source: 'Pump.fun',
      });
      score += 12;
    }
    
    // Dev still holding
    if (!pumpFunData.isCreatorSelling) {
      signals.push({
        id: 'dev_holding',
        name: 'Dev Holding',
        strength: 'weak',
        points: POTENTIAL_SIGNALS.devHolding.points,
        description: 'Creator has not sold tokens',
        source: 'Pump.fun',
      });
      score += POTENTIAL_SIGNALS.devHolding.points;
    }
    
    // High trading velocity
    if (pumpFunData.velocityScore >= 70) {
      signals.push({
        id: 'high_velocity',
        name: 'High Trading Velocity',
        strength: 'moderate',
        points: 10,
        description: `Velocity score ${pumpFunData.velocityScore}/100 - very active trading`,
        source: 'Pump.fun',
      });
      score += 10;
    }
  }

  // 🆕 Holder distribution positive signals
  if (holderData) {
    // Growing holder base
    if (holderData.totalHolders >= 500) {
      signals.push({
        id: 'many_holders',
        name: 'Large Holder Base',
        strength: 'moderate',
        points: POTENTIAL_SIGNALS.growingHolders.points,
        description: `${holderData.totalHolders.toLocaleString()} holders - good distribution`,
        source: 'Solscan',
      });
      score += POTENTIAL_SIGNALS.growingHolders.points;
    }
    
    // Low concentration
    if (holderData.concentrationRisk === 'low') {
      signals.push({
        id: 'good_distribution',
        name: 'Good Token Distribution',
        strength: 'weak',
        points: 8,
        description: `Top 10 only hold ${holderData.top10Percent.toFixed(0)}% - healthy distribution`,
        source: 'Solscan',
      });
      score += 8;
    }
  }

  // Cap at 100
  score = Math.min(100, score);

  return { score, signals };
}

// ============================================================================
// PRICE RANGE CALCULATION
// ============================================================================

/**
 * Calculate price range estimates
 * Enhanced with pump.fun bonding curve data
 */
function calculatePriceRange(
  token: TokenInfo, 
  riskScore: number,
  pumpFunData?: PumpFunAnalysis | null
): PriceRange {
  const current = token.priceUsd;
  
  // Downside based on risk and liquidity
  // Higher risk = expect bigger potential drop
  const downsidePercent = riskScore >= 80 ? -90 :
                          riskScore >= 60 ? -70 :
                          riskScore >= 40 ? -50 :
                          -30;
  
  // Upside based on market cap and momentum
  // Lower mcap = more potential upside
  let upsideMultiple = 1.5;
  if (token.marketCap < 100000) upsideMultiple = 5;
  else if (token.marketCap < 500000) upsideMultiple = 3;
  else if (token.marketCap < 2000000) upsideMultiple = 2;
  
  // 🆕 Boost upside for pump.fun tokens close to graduation
  if (pumpFunData?.token) {
    if (pumpFunData.token.bondingCurveProgress >= 70 && !pumpFunData.token.isGraduated) {
      // Close to graduation often triggers big pumps
      upsideMultiple *= 1.5;
    }
    if (pumpFunData.token.isKingOfTheHill) {
      // KOTH tokens have momentum
      upsideMultiple *= 1.3;
    }
  }

  // Adjust upside based on current momentum
  if (token.priceChange24h > 50) upsideMultiple *= 0.7; // Already pumped
  if (token.priceChange24h < -30) upsideMultiple *= 1.3; // Possible bounce
  
  const upsidePercent = (upsideMultiple - 1) * 100;

  return {
    current,
    downside: {
      price: current * (1 + downsidePercent / 100),
      percentChange: downsidePercent,
      scenario: riskScore >= 60 ? 'Rug/dump scenario' : 'Market correction',
    },
    base: {
      priceMin: current * 0.8,
      priceMax: current * 1.2,
      scenario: 'Consolidation range',
    },
    upside: {
      price: current * upsideMultiple,
      percentChange: upsidePercent,
      scenario: token.marketCap < 500000 
        ? 'Viral momentum continues' 
        : 'Sustained buying pressure',
    },
  };
}

// ============================================================================
// VERDICT GENERATION
// ============================================================================

/**
 * Generate human-readable verdict
 */
function generateVerdict(analysis: MemeCoinAnalysis): {
  verdict: string;
  emoji: string;
  summary: string;
} {
  const { riskScore, potentialScore, riskLevel, potentialLevel, token, riskFactors, potentialSignals } = analysis;

  // Determine emoji based on scores
  let emoji: string;
  if (riskScore >= 80) emoji = '🚨';
  else if (riskScore >= 60) emoji = '⚠️';
  else if (riskScore >= 40) emoji = '🟡';
  else if (potentialScore >= 60) emoji = '🟢';
  else emoji = '🔵';

  // Generate summary
  let summary: string;
  if (riskScore >= 80) {
    summary = 'Probable scam - DO NOT BUY';
  } else if (riskScore >= 60) {
    summary = 'Very high risk - strong scam signals';
  } else if (riskScore >= 40) {
    summary = potentialScore >= 50 
      ? 'High risk but some potential - trade carefully'
      : 'High risk with limited upside';
  } else {
    summary = potentialScore >= 60
      ? 'Moderate risk with good potential'
      : 'Lower risk for meme coin standards';
  }

  // Generate detailed verdict
  let verdict: string;
  
  if (riskScore >= 80) {
    const criticalFactors = riskFactors
      .filter(f => f.severity === 'critical')
      .map(f => f.name)
      .join(', ');
    verdict = `This token shows critical red flags: ${criticalFactors || 'multiple high-risk indicators'}. ` +
              `I'd strongly recommend staying away from this one. The risk/reward here is terrible.`;
  } else if (riskScore >= 60) {
    const mainRisks = riskFactors.slice(0, 3).map(f => f.description).join('; ');
    verdict = `This one's pretty sketchy. Main concerns: ${mainRisks}. ` +
              `If you absolutely must play it, size tiny and be ready to take a total loss.`;
  } else if (riskScore >= 40) {
    const positives = potentialSignals.slice(0, 2).map(s => s.description).join('; ');
    const negatives = riskFactors.slice(0, 2).map(f => f.description).join('; ');
    verdict = `Mixed signals on this one. Good: ${positives || 'decent liquidity'}. ` +
              `Watch out for: ${negatives || 'standard meme coin risks'}. ` +
              `Could work if you're comfortable with the risk profile.`;
  } else {
    const positives = potentialSignals.slice(0, 3).map(s => s.description).join('; ');
    verdict = `For a meme coin, this actually looks relatively solid. ${positives}. ` +
              `Still a degen play, but the fundamentals are better than most. ` +
              `Size according to your risk tolerance.`;
  }

  return { verdict, emoji, summary };
}

// ============================================================================
// AI CONTEXT BUILDER
// ============================================================================

/**
 * Build context string for AI to use in responses
 * Enhanced with pump.fun and holder distribution data
 */
function buildAIContext(analysis: MemeCoinAnalysis): string {
  const { 
    token, 
    security, 
    riskScore, 
    potentialScore, 
    riskFactors, 
    potentialSignals, 
    priceRange,
    pumpFunData,
    holderDistribution,
  } = analysis;

  if (!token) {
    return `Token at ${analysis.address} not found on any DEX. Cannot analyze.`;
  }

  let context = `
=== MEME COIN ANALYSIS: ${token.symbol} ===
Data Sources: ${analysis.dataSources.join(', ')}

📊 TOKEN DATA:
• Price: $${formatPrice(token.priceUsd)}
• Market Cap: $${formatNumber(token.marketCap)}
• Liquidity: $${formatNumber(token.liquidity)}
• 24h Volume: $${formatNumber(token.volume24h)}
• Age: ${token.pairAge < 1 ? `${Math.round(token.pairAge * 60)} minutes` : token.pairAge < 24 ? `${Math.round(token.pairAge)} hours` : `${Math.floor(token.pairAge / 24)} days`}
• Chain: ${token.chain} | DEX: ${token.dex}

📈 PRICE CHANGES:
• 5m: ${token.priceChange5m >= 0 ? '+' : ''}${token.priceChange5m.toFixed(1)}%
• 1h: ${token.priceChange1h >= 0 ? '+' : ''}${token.priceChange1h.toFixed(1)}%
• 24h: ${token.priceChange24h >= 0 ? '+' : ''}${token.priceChange24h.toFixed(1)}%

📊 TRADING ACTIVITY:
• Buys (24h): ${token.buys24h}
• Sells (24h): ${token.sells24h}
• Buy/Sell Ratio: ${(token.buysSells24hRatio * 100).toFixed(0)}% buys
`;

  // Add pump.fun specific data if available
  if (pumpFunData?.token) {
    const pf = pumpFunData.token;
    context += `
🎰 PUMP.FUN DATA:
• Bonding Curve: ${pf.bondingCurveProgress.toFixed(1)}%${pf.isGraduated ? ' ✅ GRADUATED' : ''}
• Replies: ${pf.replyCount}
• King of the Hill: ${pf.isKingOfTheHill ? '👑 YES' : 'No'}
• Creator: ${pf.creator.slice(0, 8)}...
• Creator Selling: ${pumpFunData.isCreatorSelling ? '⚠️ YES' : '✅ NO'}
${pumpFunData.isCreatorSelling ? `• Creator Sold: ${pumpFunData.creatorSellPercent.toFixed(1)}%` : ''}
• Velocity Score: ${pumpFunData.velocityScore}/100
• Engagement Score: ${pumpFunData.engagementScore}/100
• Recent Buys: ${pumpFunData.buyCount} (${pumpFunData.buyVolume.toFixed(2)} SOL)
• Recent Sells: ${pumpFunData.sellCount} (${pumpFunData.sellVolume.toFixed(2)} SOL)
• Unique Traders: ${pumpFunData.uniqueTraders}
${pf.hasSocials ? `• Socials: ${[pf.twitter ? 'Twitter' : '', pf.telegram ? 'Telegram' : '', pf.website ? 'Website' : ''].filter(Boolean).join(', ')}` : '• Socials: None'}
`;
  }

  // Add holder distribution data if available
  if (holderDistribution && holderDistribution.totalHolders > 0) {
    context += `
👥 HOLDER DISTRIBUTION (Solscan):
• Total Holders: ${holderDistribution.totalHolders.toLocaleString()}
• Concentration Risk: ${holderDistribution.concentrationRisk.toUpperCase()}
• Top 10 Hold: ${holderDistribution.top10Percent.toFixed(1)}%
• Top 20 Hold: ${holderDistribution.top20Percent.toFixed(1)}%
• Whale Count (>1%): ${holderDistribution.whaleCount}
• Creator Holdings: ${holderDistribution.creatorPercent > 0 ? holderDistribution.creatorPercent.toFixed(2) + '%' : 'Unknown'}
• LP Holdings: ${holderDistribution.lpPercent.toFixed(1)}%
`;
  }

  // 🆕 Phase 5: Add smart money data if available
  if (analysis.smartMoneyData) {
    context += buildSmartMoneyContext(analysis.smartMoneyData) + '\n';
  }

  // 🆕 Phase 5: Add Twitter data if available
  if (analysis.twitterData && analysis.twitterData.totalMentions > 0) {
    context += buildTwitterContext(analysis.twitterData) + '\n';
  }

  // 🆕 Phase 5: Add RugCheck data if available
  if (analysis.rugcheckData) {
    context += buildRugCheckContext(analysis.rugcheckData) + '\n';
  }

  context += `
🎯 RISK SCORE: ${riskScore}/100 (${analysis.riskLevel.toUpperCase()})
${riskFactors.length > 0 ? '⚠️ Risk Factors:\n' + riskFactors.map(f => `  • ${f.name}: ${f.description} [${f.source}]`).join('\n') : ''}

✨ POTENTIAL SCORE: ${potentialScore}/100 (${analysis.potentialLevel.toUpperCase()})
${potentialSignals.length > 0 ? '✅ Positive Signals:\n' + potentialSignals.map(s => `  • ${s.name}: ${s.description} [${s.source}]`).join('\n') : ''}

📊 RISK/REWARD: ${analysis.riskRewardRatio.toFixed(2)} | Confidence: ${analysis.confidenceLevel}%
`;

  // Add trading recommendation
  if (analysis.tradingRecommendation) {
    const rec = analysis.tradingRecommendation;
    context += `
🎯 TRADING RECOMMENDATION: ${rec.action.replace(/_/g, ' ')}
• Reasoning: ${rec.reasoning}
• Suggested Size: ${rec.suggestedSizePercent}% of normal position
• Entry Strategy: ${rec.entryStrategy}
• Exit Strategy: ${rec.exitStrategy}
• Time Horizon: ${rec.timeHorizon}
`;
  }

  if (priceRange) {
    context += `
💰 PRICE RANGE ESTIMATE (24h):
• Downside: $${formatPrice(priceRange.downside.price)} (${priceRange.downside.percentChange}%) - ${priceRange.downside.scenario}
• Base: $${formatPrice(priceRange.base.priceMin)} - $${formatPrice(priceRange.base.priceMax)} - ${priceRange.base.scenario}
• Upside: $${formatPrice(priceRange.upside.price)} (+${priceRange.upside.percentChange.toFixed(0)}%) - ${priceRange.upside.scenario}
`;
  }

  // Add key points summary
  if (analysis.keyPoints && analysis.keyPoints.length > 0) {
    context += `
📋 KEY POINTS:
${analysis.keyPoints.map(p => `  ${p}`).join('\n')}
`;
  }

  context += `
🔗 Links:
• DEX: ${token.pairUrl}
${pumpFunData?.token ? `• Pump.fun: https://pump.fun/${pumpFunData.token.mint}` : ''}
• Verified: ${token.isVerified ? 'Yes' : 'No'}

💬 VERDICT: ${analysis.verdict}
`;

  return context.trim();
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

function formatNumber(num: number): string {
  if (num >= 1000000000) return `${(num / 1000000000).toFixed(1)}B`;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(0);
}

function formatPrice(price: number): string {
  if (price === 0) return '0';
  if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  if (price >= 0.0001) return price.toFixed(6);
  if (price >= 0.00000001) return price.toFixed(10);
  return price.toExponential(4);
}

// ============================================================================
// EXPORTS
// ============================================================================

export const memeCoinIntelligence = {
  analyze: analyzeMemeToken,
  getRiskLevel,
  getPotentialLevel,
};

export default memeCoinIntelligence;
