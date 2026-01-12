/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🔍 RUGCHECK API SERVICE - Token Security Analysis                         ║
 * ║                                                                               ║
 * ║   Integrates with RugCheck.xyz API for comprehensive Solana token security    ║
 * ║   analysis. Detects honeypots, mint authority risks, and other red flags.     ║
 * ║                                                                               ║
 * ║   API: https://api.rugcheck.xyz/                                              ║
 * ║                                                                               ║
 * ║   FEATURES:                                                                   ║
 * ║   • Honeypot detection                                                        ║
 * ║   • Mint authority analysis                                                   ║
 * ║   • Freeze authority check                                                    ║
 * ║   • LP lock verification                                                      ║
 * ║   • Top holder analysis                                                       ║
 * ║   • Overall risk scoring                                                      ║
 * ║                                                                               ║
 * ║   @version 1.0.0                                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * RugCheck risk level
 */
export type RugCheckRiskLevel = 'Good' | 'Neutral' | 'Warn' | 'Danger';

/**
 * Individual risk factor from RugCheck
 */
export interface RugCheckRisk {
  name: string;
  description: string;
  level: RugCheckRiskLevel;
  score: number;
  value?: string | number;
}

/**
 * Token holder info
 */
export interface RugCheckHolder {
  address: string;
  percentage: number;
  isContract: boolean;
  label?: string;  // LP, DEX, etc.
}

/**
 * Market info from RugCheck
 */
export interface RugCheckMarket {
  pubkey: string;
  marketType: string;
  liquidityA?: number;
  liquidityB?: number;
  liquidityAUsd?: number;
  liquidityBUsd?: number;
  lpLocked: boolean;
  lpLockedPercent?: number;
  lpBurnPercent?: number;
}

/**
 * Complete RugCheck analysis
 */
export interface RugCheckAnalysis {
  token: string;
  symbol: string;
  name: string;
  
  // Overall assessment
  overallRisk: RugCheckRiskLevel;
  riskScore: number;          // 0-100 (lower = safer)
  isSafe: boolean;
  isHoneypot: boolean;
  
  // Authority risks
  mintAuthorityEnabled: boolean;
  freezeAuthorityEnabled: boolean;
  ownershipRenounced: boolean;
  
  // LP analysis
  lpLocked: boolean;
  lpLockedPercent: number;
  lpBurnedPercent: number;
  totalLiquidityUsd: number;
  
  // Holder analysis
  topHolderPercent: number;
  top10HolderPercent: number;
  holderCount: number;
  
  // Individual risks detected
  risks: RugCheckRisk[];
  
  // Markets
  markets: RugCheckMarket[];
  
  // Metadata
  analysisTimestamp: Date;
  dataSource: string;
}

/**
 * Raw RugCheck API response
 */
interface RugCheckResponse {
  mint: string;
  tokenMeta?: {
    name?: string;
    symbol?: string;
    uri?: string;
    updateAuthority?: string;
  };
  token?: {
    mintAuthority?: string;
    freezeAuthority?: string;
    supply?: number;
    decimals?: number;
  };
  creator?: string;
  risks?: Array<{
    name: string;
    description: string;
    level: string;
    score: number;
    value?: string;
  }>;
  markets?: Array<{
    pubkey: string;
    marketType: string;
    liquidityA?: number;
    liquidityB?: number;
    liquidityAUsd?: number;
    liquidityBUsd?: number;
    lp?: {
      locked?: number;
      lpLockedPct?: number;
      lpBurnPct?: number;
    };
  }>;
  topHolders?: Array<{
    address: string;
    pct: number;
    isInsider?: boolean;
  }>;
  score?: number;
  rugged?: boolean;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const RUGCHECK_API_URL = 'https://api.rugcheck.xyz/v1';

// Rate limiting
const RATE_LIMIT_DELAY_MS = 500;
let lastRequestTime = 0;

// Cache
const cache = new Map<string, { data: RugCheckAnalysis; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;  // 5 minute cache

// Risk score thresholds
const RISK_THRESHOLDS = {
  safe: 200,      // 0-200 = Good
  neutral: 500,   // 201-500 = Neutral
  warn: 1000,     // 501-1000 = Warn
  // > 1000 = Danger
};

// ============================================================================
// API HELPERS
// ============================================================================

/**
 * Rate-limited fetch for RugCheck API
 */
async function rugcheckFetch<T>(
  endpoint: string,
  cacheKey?: string
): Promise<T | null> {
  // Check cache
  if (cacheKey) {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data as T;
    }
  }

  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_DELAY_MS) {
    await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();

  try {
    const response = await fetch(`${RUGCHECK_API_URL}${endpoint}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        logger.debug('🔍 Token not found on RugCheck', { endpoint });
        return null;
      }
      if (response.status === 429) {
        logger.warn('🔍 RugCheck rate limit hit');
        return null;
      }
      throw new Error(`RugCheck API error: ${response.status}`);
    }

    const data = await response.json();
    return data as T;

  } catch (error) {
    logger.error('🔍 RugCheck API error', {
      endpoint,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// ============================================================================
// RISK PROCESSING
// ============================================================================

/**
 * Convert raw score to risk level
 */
function scoreToRiskLevel(score: number): RugCheckRiskLevel {
  if (score <= RISK_THRESHOLDS.safe) return 'Good';
  if (score <= RISK_THRESHOLDS.neutral) return 'Neutral';
  if (score <= RISK_THRESHOLDS.warn) return 'Warn';
  return 'Danger';
}

/**
 * Normalize score to 0-100 (lower = safer)
 */
function normalizeScore(score: number): number {
  // RugCheck scores typically range 0-2000+
  // We normalize to 0-100 where:
  // 0-200 → 0-25 (Good)
  // 200-500 → 25-50 (Neutral)
  // 500-1000 → 50-75 (Warn)
  // 1000+ → 75-100 (Danger)
  
  if (score <= 200) return Math.round((score / 200) * 25);
  if (score <= 500) return 25 + Math.round(((score - 200) / 300) * 25);
  if (score <= 1000) return 50 + Math.round(((score - 500) / 500) * 25);
  return Math.min(100, 75 + Math.round(((score - 1000) / 1000) * 25));
}

/**
 * Process raw risks into our format
 */
function processRisks(rawRisks: RugCheckResponse['risks']): RugCheckRisk[] {
  if (!rawRisks) return [];

  return rawRisks.map(r => ({
    name: r.name,
    description: r.description,
    level: (r.level as RugCheckRiskLevel) || 'Neutral',
    score: r.score,
    value: r.value,
  }));
}

/**
 * Check if token is a honeypot based on risks
 */
function detectHoneypot(risks: RugCheckRisk[]): boolean {
  const honeypotIndicators = [
    'Copycat token',
    'Freeze authority still enabled',
    'Cannot sell',
    'High sell fee',
    'Honeypot',
  ];

  return risks.some(r => 
    r.level === 'Danger' && 
    honeypotIndicators.some(i => r.name.toLowerCase().includes(i.toLowerCase()))
  );
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * 🔍 Analyze token security using RugCheck
 */
export async function analyzeTokenSecurity(tokenAddress: string): Promise<RugCheckAnalysis | null> {
  const startTime = performance.now();

  logger.debug('🔍 Starting RugCheck analysis', {
    token: tokenAddress.slice(0, 8),
  });

  // Check cache first
  const cacheKey = `rugcheck:${tokenAddress}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    logger.debug('🔍 Returning cached RugCheck data', { token: tokenAddress.slice(0, 8) });
    return cached.data;
  }

  try {
    // Fetch token report
    const report = await rugcheckFetch<RugCheckResponse>(
      `/tokens/${tokenAddress}/report`
    );

    if (!report) {
      logger.debug('🔍 Token not found on RugCheck', { token: tokenAddress.slice(0, 8) });
      return null;
    }

    // Process risks
    const risks = processRisks(report.risks);
    
    // Determine overall risk
    const rawScore = report.score || 0;
    const normalizedScore = normalizeScore(rawScore);
    const overallRisk = scoreToRiskLevel(rawScore);
    
    // Check for honeypot
    const isHoneypot = detectHoneypot(risks) || report.rugged === true;

    // Authority analysis
    const mintAuthorityEnabled = !!report.token?.mintAuthority;
    const freezeAuthorityEnabled = !!report.token?.freezeAuthority;
    const ownershipRenounced = !mintAuthorityEnabled && !freezeAuthorityEnabled;

    // LP analysis
    let lpLocked = false;
    let lpLockedPercent = 0;
    let lpBurnedPercent = 0;
    let totalLiquidityUsd = 0;

    const markets: RugCheckMarket[] = (report.markets || []).map(m => {
      const market: RugCheckMarket = {
        pubkey: m.pubkey,
        marketType: m.marketType,
        liquidityA: m.liquidityA,
        liquidityB: m.liquidityB,
        liquidityAUsd: m.liquidityAUsd,
        liquidityBUsd: m.liquidityBUsd,
        lpLocked: (m.lp?.lpLockedPct || 0) > 50,
        lpLockedPercent: m.lp?.lpLockedPct || 0,
        lpBurnPercent: m.lp?.lpBurnPct || 0,
      };

      // Aggregate LP metrics
      if (market.lpLockedPercent > lpLockedPercent) {
        lpLockedPercent = market.lpLockedPercent;
        lpLocked = lpLockedPercent > 50;
      }
      if (market.lpBurnPercent > lpBurnedPercent) {
        lpBurnedPercent = market.lpBurnPercent;
      }
      totalLiquidityUsd += (m.liquidityAUsd || 0) + (m.liquidityBUsd || 0);

      return market;
    });

    // Holder analysis
    const topHolders = report.topHolders || [];
    const topHolderPercent = topHolders[0]?.pct || 0;
    const top10HolderPercent = topHolders.slice(0, 10).reduce((sum, h) => sum + h.pct, 0);
    const holderCount = topHolders.length; // RugCheck returns sample

    const analysis: RugCheckAnalysis = {
      token: tokenAddress,
      symbol: report.tokenMeta?.symbol || 'UNKNOWN',
      name: report.tokenMeta?.name || 'Unknown Token',
      overallRisk,
      riskScore: normalizedScore,
      isSafe: overallRisk === 'Good' && !isHoneypot,
      isHoneypot,
      mintAuthorityEnabled,
      freezeAuthorityEnabled,
      ownershipRenounced,
      lpLocked,
      lpLockedPercent,
      lpBurnedPercent,
      totalLiquidityUsd,
      topHolderPercent,
      top10HolderPercent,
      holderCount,
      risks,
      markets,
      analysisTimestamp: new Date(),
      dataSource: 'RugCheck.xyz',
    };

    // Cache result
    cache.set(cacheKey, { data: analysis, timestamp: Date.now() });

    logger.debug('🔍 RugCheck analysis complete', {
      token: tokenAddress.slice(0, 8),
      symbol: analysis.symbol,
      risk: analysis.overallRisk,
      score: analysis.riskScore,
      isHoneypot: analysis.isHoneypot,
      processingMs: (performance.now() - startTime).toFixed(1),
    });

    return analysis;

  } catch (error) {
    logger.error('🔍 RugCheck analysis failed', {
      token: tokenAddress,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// ============================================================================
// AI CONTEXT BUILDER
// ============================================================================

/**
 * Build AI context string from RugCheck analysis
 */
export function buildRugCheckContext(analysis: RugCheckAnalysis): string {
  let context = `
🔍 RUGCHECK SECURITY ANALYSIS:
• Overall Risk: ${analysis.overallRisk.toUpperCase()} (${analysis.riskScore}/100)
• Status: ${analysis.isHoneypot ? '🚨 HONEYPOT DETECTED' : analysis.isSafe ? '✅ SAFE' : '⚠️ CAUTION'}

🔐 Authority Status:
• Mint Authority: ${analysis.mintAuthorityEnabled ? '⚠️ ENABLED (can mint)' : '✅ Disabled'}
• Freeze Authority: ${analysis.freezeAuthorityEnabled ? '⚠️ ENABLED (can freeze)' : '✅ Disabled'}
• Ownership: ${analysis.ownershipRenounced ? '✅ Renounced' : '⚠️ Not renounced'}

💧 Liquidity:
• Total Liquidity: $${formatNumber(analysis.totalLiquidityUsd)}
• LP Locked: ${analysis.lpLocked ? `✅ ${analysis.lpLockedPercent.toFixed(0)}%` : '❌ Not locked'}
• LP Burned: ${analysis.lpBurnedPercent > 0 ? `${analysis.lpBurnedPercent.toFixed(0)}%` : 'None'}

👥 Holders:
• Top Holder: ${analysis.topHolderPercent.toFixed(1)}%
• Top 10: ${analysis.top10HolderPercent.toFixed(1)}%
`;

  // Add specific risks
  const dangerRisks = analysis.risks.filter(r => r.level === 'Danger');
  const warnRisks = analysis.risks.filter(r => r.level === 'Warn');

  if (dangerRisks.length > 0) {
    context += `
🚨 DANGER RISKS:
${dangerRisks.map(r => `  • ${r.name}: ${r.description}`).join('\n')}
`;
  }

  if (warnRisks.length > 0) {
    context += `
⚠️ WARNING RISKS:
${warnRisks.map(r => `  • ${r.name}: ${r.description}`).join('\n')}
`;
  }

  return context.trim();
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(0);
}

// ============================================================================
// EXPORTS
// ============================================================================

export const rugcheckApi = {
  analyzeTokenSecurity,
  buildRugCheckContext,
};

export default rugcheckApi;
