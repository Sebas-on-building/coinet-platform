/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🎯 TOKEN CONTEXT ORCHESTRATOR - Entity-Driven Enrichment                  ║
 * ║                                                                               ║
 * ║   The main orchestrator that:                                                 ║
 * ║   1. Detects token entities in user messages                                  ║
 * ║   2. Resolves tickers to addresses                                            ║
 * ║   3. Fetches data from modules based on budget                                ║
 * ║   4. Builds standardized TokenContext with FACT_GATE                          ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Production-ready, anti-hallucination design               ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../utils/logger';
import {
  TokenRef,
  TokenContext,
  TokenContextRequest,
  ResolvedToken,
  BudgetTier,
  EntityDetectionResult,
  ChainId,
  ModuleResult,
  DexScreenerData,
  SecurityData,
  HoldersData,
  PumpFunData,
  SmartMoneyData,
} from './types';
import { detectTokenEntities, resolveToken, generateClarificationQuestion } from './resolver';
import { tokenContextCache } from './cache';
import { fetchDexScreenerData, formatDexScreenerForDisplay } from './modules/dexscreener';
import { fetchSecurityData, formatSecurityForDisplay } from './modules/security';

// Import existing services for holders and pump.fun
import { solscanApi } from '../solscan-api';
import { pumpFunApi } from '../pump-fun-api';
import { birdeyeApi } from '../birdeye-api';

// ============================================================================
// BUDGET CONFIGURATION
// ============================================================================

interface BudgetConfig {
  modules: string[];
  description: string;
}

const BUDGET_CONFIGS: Record<BudgetTier, BudgetConfig> = {
  minimal: {
    modules: ['dexscreener'],
    description: 'Price only - for simple price queries',
  },
  standard: {
    modules: ['dexscreener', 'security', 'holders'],
    description: 'Core analysis - for "should I buy" questions',
  },
  full: {
    modules: ['dexscreener', 'security', 'holders', 'pumpfun', 'smartMoney'],
    description: 'Full analysis - for deep dives',
  },
};

// Intent patterns for budget selection
const MINIMAL_PATTERNS = [
  /\bprice\b/i,
  /\bhow much\b/i,
  /\bwhat('?s| is) .* (at|worth|trading)\b/i,
];

const FULL_PATTERNS = [
  /\bfull analysis\b/i,
  /\bdeep dive\b/i,
  /\bdetailed\b/i,
  /\bbreakdown\b/i,
  /\beverything about\b/i,
];

// ============================================================================
// FACT GATE TEMPLATE
// ============================================================================

const FACT_GATE_TEMPLATE = `
════════════════════════════════════════════════════════════════════════════════
🚨 FACT GATE — NON-NEGOTIABLE DATA RULES
════════════════════════════════════════════════════════════════════════════════

You may ONLY state the following about this token if the data exists below:
• Price, volume, liquidity, market cap → from DEXSCREENER section
• Risk flags, honeypot, taxes → from SECURITY section  
• Holder count, concentration → from HOLDERS section
• Bonding curve, creator activity → from PUMPFUN section (Solana only)
• Smart money signals → from SMARTMONEY section

MISSING DATA:
{{MISSING_MODULES}}

For missing data: say "I don't have [X] data" — DO NOT INVENT IT.
════════════════════════════════════════════════════════════════════════════════
`;

// ============================================================================
// MAIN ORCHESTRATOR FUNCTION
// ============================================================================

/**
 * Build complete token context from a message
 * This is the main entry point for entity-driven enrichment
 */
export interface BuildTokenContextOptions {
  /** Pre-resolved token from session cache */
  preResolved?: ResolvedToken;
}

export async function buildTokenContext(
  message: string,
  budgetOverride?: BudgetTier,
  options?: BuildTokenContextOptions
): Promise<TokenContext | null> {
  const startTime = Date.now();
  
  // 1. Detect token entities
  const detection = detectTokenEntities(message);
  
  if (!detection.hasTokenEntity || !detection.primaryEntity) {
    logger.debug('🎯 No token entity detected in message');
    return null;
  }
  
  const tokenRef = detection.primaryEntity.ref;
  
  logger.info('🎯 Token entity detected', {
    type: tokenRef.type,
    raw: tokenRef.raw,
    chain: tokenRef.chain,
    confidence: tokenRef.confidence,
    needsResolution: detection.needsResolution,
  });
  
  // 2. Use pre-resolved token from cache or resolve fresh
  let resolved: ResolvedToken | null = options?.preResolved || null;
  
  if (resolved) {
    logger.debug('🎯 Using pre-resolved token from cache', {
      address: resolved.address.slice(0, 10),
      chain: resolved.chain,
    });
  } else if (tokenRef.type === 'contract_address' || tokenRef.type === 'dexscreener_url' || tokenRef.type === 'pumpfun_url') {
    // Already have an address, just validate and get metadata
    resolved = await resolveToken(tokenRef);
  } else if (tokenRef.type === 'ticker') {
    // Need to resolve ticker to address
    resolved = await resolveToken(tokenRef);
  }
  
  // 3. Check if clarification is needed
  if (!resolved || resolved.isAmbiguous) {
    const clarificationQuestion = generateClarificationQuestion(resolved, tokenRef);
    
    return {
      resolved: resolved,
      isResolved: false,
      needsClarification: true,
      clarificationQuestion,
      builtAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      dexscreener: null,
      security: null,
      holders: null,
      pumpfun: null,
      smartMoney: null,
      coverage: {
        available: [],
        missing: ['all'],
        notApplicable: [],
      },
      budgetTier: 'minimal',
      modulesRequested: [],
      modulesFetched: [],
      factGate: generateFactGate(['dexscreener', 'security', 'holders', 'pumpfun', 'smartMoney']),
      rawContext: generateClarificationContext(tokenRef, clarificationQuestion),
    };
  }
  
  // 4. Determine budget tier
  const budgetTier = budgetOverride || determineBudgetTier(message);
  const budgetConfig = BUDGET_CONFIGS[budgetTier];
  
  logger.info('🎯 Budget tier selected', {
    tier: budgetTier,
    modules: budgetConfig.modules,
    address: resolved.address.slice(0, 10),
    chain: resolved.chain,
  });
  
  // 5. Fetch modules based on budget
  const context = await fetchModules(resolved, budgetConfig.modules);
  
  // 6. Build final TokenContext
  const tokenContext: TokenContext = {
    resolved,
    isResolved: true,
    needsClarification: false,
    builtAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60000).toISOString(),
    ...context,
    budgetTier,
    modulesRequested: budgetConfig.modules,
    modulesFetched: context.coverage.available,
    factGate: generateFactGate(context.coverage.missing),
    rawContext: generateRawContext(resolved, context),
  };
  
  logger.info('🎯 Token context built', {
    address: resolved.address.slice(0, 10),
    chain: resolved.chain,
    symbol: resolved.symbol,
    modulesAvailable: context.coverage.available.join(', '),
    modulesMissing: context.coverage.missing.join(', '),
    durationMs: Date.now() - startTime,
  });
  
  return tokenContext;
}

// ============================================================================
// BUDGET DETERMINATION
// ============================================================================

/**
 * Determine budget tier from user intent
 */
function determineBudgetTier(message: string): BudgetTier {
  const lowerMessage = message.toLowerCase();
  
  // Check for minimal (price only)
  if (MINIMAL_PATTERNS.some(p => p.test(message))) {
    return 'minimal';
  }
  
  // Check for full analysis
  if (FULL_PATTERNS.some(p => p.test(message))) {
    return 'full';
  }
  
  // Check for analysis-indicating patterns
  const analysisPatterns = [
    /\bshould i (buy|ape|enter)\b/i,
    /\banalysis\b/i,
    /\banalyze\b/i,
    /\brug ?check\b/i,
    /\bscam\b/i,
    /\bsafe\b/i,
    /\blegit\b/i,
    /\bhoneypot\b/i,
  ];
  
  if (analysisPatterns.some(p => p.test(message))) {
    return 'standard';
  }
  
  // Default to standard for any token mention
  return 'standard';
}

// ============================================================================
// MODULE FETCHING
// ============================================================================

interface ModuleFetchResult {
  dexscreener: ModuleResult<DexScreenerData> | null;
  security: ModuleResult<SecurityData> | null;
  holders: ModuleResult<HoldersData> | null;
  pumpfun: ModuleResult<PumpFunData> | null;
  smartMoney: ModuleResult<SmartMoneyData> | null;
  coverage: {
    available: string[];
    missing: string[];
    notApplicable: string[];
  };
}

/**
 * Fetch all requested modules
 */
async function fetchModules(
  resolved: ResolvedToken,
  requestedModules: string[]
): Promise<ModuleFetchResult> {
  const result: ModuleFetchResult = {
    dexscreener: null,
    security: null,
    holders: null,
    pumpfun: null,
    smartMoney: null,
    coverage: {
      available: [],
      missing: [],
      notApplicable: [],
    },
  };
  
  const chain = resolved.chain;
  const address = resolved.address;
  
  // Check cache and fetch in parallel
  const fetchPromises: Promise<void>[] = [];
  
  // DexScreener
  if (requestedModules.includes('dexscreener')) {
    fetchPromises.push((async () => {
      const cached = tokenContextCache.get<ModuleResult<DexScreenerData>>('dexscreener', address, chain);
      if (cached) {
        result.dexscreener = cached;
      } else {
        result.dexscreener = await fetchDexScreenerData(address, chain);
        if (result.dexscreener.status === 'success') {
          tokenContextCache.set('dexscreener', address, chain, result.dexscreener);
        }
      }
    })());
  }
  
  // Security
  if (requestedModules.includes('security')) {
    fetchPromises.push((async () => {
      const cached = tokenContextCache.get<ModuleResult<SecurityData>>('security', address, chain);
      if (cached) {
        result.security = cached;
      } else {
        result.security = await fetchSecurityData(address, chain);
        if (result.security.status === 'success') {
          tokenContextCache.set('security', address, chain, result.security);
        }
      }
    })());
  }
  
  // Holders (Solana only via Solscan)
  if (requestedModules.includes('holders')) {
    if (chain === 'solana') {
      fetchPromises.push((async () => {
        const cached = tokenContextCache.get<ModuleResult<HoldersData>>('holders', address, chain);
        if (cached) {
          result.holders = cached;
        } else {
          try {
            const holderData = await solscanApi.analyzeHolderDistribution(address);
            if (holderData) {
              result.holders = {
                status: 'success',
                timestamp: new Date().toISOString(),
                ttlSeconds: 300,
                data: {
                  totalHolders: holderData.totalHolders || 0,
                  top10Concentration: holderData.top10Concentration || 0,
                  top20Concentration: holderData.top20Concentration || 0,
                  topHolders: holderData.topHolders || [],
                  whaleCount: holderData.whaleCount || 0,
                  retailCount: holderData.retailCount || 0,
                  distributionScore: holderData.distributionScore || 50,
                },
                source: 'solscan',
              };
              tokenContextCache.set('holders', address, chain, result.holders);
            } else {
              result.holders = {
                status: 'failed',
                timestamp: new Date().toISOString(),
                ttlSeconds: 60,
                data: null,
                error: 'Holder data not available',
                source: 'solscan',
              };
            }
          } catch (error: any) {
            result.holders = {
              status: 'failed',
              timestamp: new Date().toISOString(),
              ttlSeconds: 60,
              data: null,
              error: error.message,
              source: 'solscan',
            };
          }
        }
      })());
    } else {
      // EVM holder data not implemented yet
      result.coverage.notApplicable.push('holders');
    }
  }
  
  // pump.fun (Solana only)
  if (requestedModules.includes('pumpfun')) {
    if (chain === 'solana') {
      fetchPromises.push((async () => {
        const cached = tokenContextCache.get<ModuleResult<PumpFunData>>('pumpfun', address, chain);
        if (cached) {
          result.pumpfun = cached;
        } else {
          try {
            const pumpData = await pumpFunApi.analyze(address);
            if (pumpData?.token) {
              result.pumpfun = {
                status: 'success',
                timestamp: new Date().toISOString(),
                ttlSeconds: 30,
                data: {
                  bondingCurveProgress: pumpData.token.bondingCurveProgress || 0,
                  isGraduated: pumpData.token.isGraduated || false,
                  raydiumPool: pumpData.token.raydiumPool || null,
                  creator: pumpData.token.creator || '',
                  createdAt: pumpData.token.createdAt?.toISOString() || new Date().toISOString(),
                  ageMinutes: pumpData.token.ageMinutes || 0,
                  replyCount: pumpData.token.replyCount || 0,
                  isKingOfTheHill: pumpData.token.isKingOfTheHill || false,
                  virtualSolReserves: pumpData.token.virtualSolReserves || 0,
                  virtualTokenReserves: pumpData.token.virtualTokenReserves || 0,
                  recentBuys: pumpData.buyCount || 0,
                  recentSells: pumpData.sellCount || 0,
                  isCreatorSelling: pumpData.isCreatorSelling || false,
                  creatorSellPercent: pumpData.creatorSellPercent || 0,
                },
                source: 'pumpfun',
              };
              tokenContextCache.set('pumpfun', address, chain, result.pumpfun);
            } else {
              // Not a pump.fun token
              result.coverage.notApplicable.push('pumpfun');
            }
          } catch (error: any) {
            // Token not on pump.fun
            result.coverage.notApplicable.push('pumpfun');
          }
        }
      })());
    } else {
      result.coverage.notApplicable.push('pumpfun');
    }
  }
  
  // Smart Money (Solana only via Birdeye)
  if (requestedModules.includes('smartMoney')) {
    if (chain === 'solana') {
      fetchPromises.push((async () => {
        const cached = tokenContextCache.get<ModuleResult<SmartMoneyData>>('smartMoney', address, chain);
        if (cached) {
          result.smartMoney = cached;
        } else {
          try {
            const smartData = await birdeyeApi.analyzeSmartMoney(address);
            if (smartData) {
              result.smartMoney = {
                status: 'success',
                timestamp: new Date().toISOString(),
                ttlSeconds: 180,
                data: {
                  smartMoneyHolders: smartData.smartMoneyHolders || 0,
                  smartMoneyPercentage: smartData.smartMoneyPercentage || 0,
                  recentSmartMoneyActivity: smartData.recentActivity || [],
                  signalStrength: smartData.signalStrength || 'neutral',
                },
                source: 'birdeye',
              };
              tokenContextCache.set('smartMoney', address, chain, result.smartMoney);
            } else {
              result.smartMoney = {
                status: 'failed',
                timestamp: new Date().toISOString(),
                ttlSeconds: 60,
                data: null,
                error: 'Smart money data not available',
                source: 'birdeye',
              };
            }
          } catch (error: any) {
            result.smartMoney = {
              status: 'failed',
              timestamp: new Date().toISOString(),
              ttlSeconds: 60,
              data: null,
              error: error.message,
              source: 'birdeye',
            };
          }
        }
      })());
    } else {
      result.coverage.notApplicable.push('smartMoney');
    }
  }
  
  // Wait for all fetches to complete
  await Promise.all(fetchPromises);
  
  // Build coverage summary
  const moduleKeys = ['dexscreener', 'security', 'holders', 'pumpfun', 'smartMoney'] as const;
  
  for (const key of moduleKeys) {
    if (!requestedModules.includes(key)) continue;
    if (result.coverage.notApplicable.includes(key)) continue;
    
    const moduleResult = result[key];
    if (moduleResult?.status === 'success' && moduleResult.data) {
      result.coverage.available.push(key);
    } else if (!result.coverage.notApplicable.includes(key)) {
      result.coverage.missing.push(key);
    }
  }
  
  return result;
}

// ============================================================================
// CONTEXT GENERATION
// ============================================================================

/**
 * Generate the FACT_GATE guardrail text
 */
function generateFactGate(missingModules: string[]): string {
  const missingText = missingModules.length > 0
    ? missingModules.map(m => `• ${m.toUpperCase()}: NOT AVAILABLE — do not mention`).join('\n')
    : '• All requested data available';
  
  return FACT_GATE_TEMPLATE.replace('{{MISSING_MODULES}}', missingText);
}

/**
 * Generate clarification context when resolution fails
 */
function generateClarificationContext(tokenRef: TokenRef, question?: string): string {
  return `
════════════════════════════════════════════════════════════════════════════════
⚠️ TOKEN RESOLUTION REQUIRED
════════════════════════════════════════════════════════════════════════════════

User mentioned: ${tokenRef.raw}
Type: ${tokenRef.type}
${tokenRef.chain ? `Possible chain: ${tokenRef.chain}` : 'Chain: Unknown'}

INSTRUCTION: You MUST ask the user for clarification before providing any analysis.
${question ? `Suggested question: "${question}"` : ''}

DO NOT:
• Invent price, liquidity, holder, or security data
• Assume which token the user means
• Provide analysis without confirmed token identity

DO:
• Ask for the contract address or chain
• Keep the question short and direct
════════════════════════════════════════════════════════════════════════════════
`;
}

/**
 * Generate the full raw context for AI injection
 */
function generateRawContext(
  resolved: ResolvedToken,
  modules: ModuleFetchResult
): string {
  const parts: string[] = [];
  
  // Header
  parts.push(`
════════════════════════════════════════════════════════════════════════════════
📊 TOKEN CONTEXT: ${resolved.symbol} (${resolved.name})
════════════════════════════════════════════════════════════════════════════════

• Address: ${resolved.address}
• Chain: ${resolved.chain}
• Resolved at: ${resolved.resolvedAt}
• Confidence: ${(resolved.resolutionConfidence * 100).toFixed(0)}%
`);

  // FACT GATE
  parts.push(generateFactGate(modules.coverage.missing));
  
  // DexScreener data
  if (modules.dexscreener?.status === 'success' && modules.dexscreener.data) {
    parts.push(`
────────────────────────────────────────────────────────────────────────────────
📈 DEXSCREENER DATA (fetched: ${modules.dexscreener.timestamp})
────────────────────────────────────────────────────────────────────────────────
${formatDexScreenerForDisplay(modules.dexscreener.data)}
`);
  }
  
  // Security data
  if (modules.security?.status === 'success' && modules.security.data) {
    parts.push(`
────────────────────────────────────────────────────────────────────────────────
🛡️ SECURITY DATA (source: ${modules.security.source}, fetched: ${modules.security.timestamp})
────────────────────────────────────────────────────────────────────────────────
${formatSecurityForDisplay(modules.security.data)}
`);
  }
  
  // Holders data
  if (modules.holders?.status === 'success' && modules.holders.data) {
    const h = modules.holders.data;
    parts.push(`
────────────────────────────────────────────────────────────────────────────────
👥 HOLDERS DATA (source: ${modules.holders.source}, fetched: ${modules.holders.timestamp})
────────────────────────────────────────────────────────────────────────────────
• Total Holders: ${h.totalHolders.toLocaleString()}
• Top 10 Concentration: ${h.top10Concentration.toFixed(1)}%
• Top 20 Concentration: ${h.top20Concentration.toFixed(1)}%
• Whale Count (>1%): ${h.whaleCount}
• Distribution Score: ${h.distributionScore}/100
`);
  }
  
  // pump.fun data
  if (modules.pumpfun?.status === 'success' && modules.pumpfun.data) {
    const p = modules.pumpfun.data;
    parts.push(`
────────────────────────────────────────────────────────────────────────────────
🎰 PUMP.FUN DATA (fetched: ${modules.pumpfun.timestamp})
────────────────────────────────────────────────────────────────────────────────
• Bonding Curve: ${p.bondingCurveProgress.toFixed(1)}%
• Graduated: ${p.isGraduated ? 'Yes' : 'No'}
• Age: ${p.ageMinutes.toFixed(0)} minutes
• Replies: ${p.replyCount}
• King of the Hill: ${p.isKingOfTheHill ? 'Yes' : 'No'}
• Recent Trades: ${p.recentBuys} buys / ${p.recentSells} sells
• Creator Selling: ${p.isCreatorSelling ? `YES (${p.creatorSellPercent.toFixed(1)}%)` : 'No'}
`);
  }
  
  // Smart money data
  if (modules.smartMoney?.status === 'success' && modules.smartMoney.data) {
    const s = modules.smartMoney.data;
    parts.push(`
────────────────────────────────────────────────────────────────────────────────
🧠 SMART MONEY DATA (source: ${modules.smartMoney.source}, fetched: ${modules.smartMoney.timestamp})
────────────────────────────────────────────────────────────────────────────────
• Smart Money Holders: ${s.smartMoneyHolders}
• Smart Money %: ${s.smartMoneyPercentage.toFixed(1)}%
• Signal: ${s.signalStrength.toUpperCase()}
`);
  }
  
  // Coverage footer
  parts.push(`
════════════════════════════════════════════════════════════════════════════════
COVERAGE SUMMARY:
• Available: ${modules.coverage.available.join(', ') || 'none'}
• Missing: ${modules.coverage.missing.join(', ') || 'none'}
• Not Applicable: ${modules.coverage.notApplicable.join(', ') || 'none'}
════════════════════════════════════════════════════════════════════════════════
`);
  
  return parts.join('\n');
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  detectTokenEntities,
  resolveToken,
  generateClarificationQuestion,
  determineBudgetTier,
};
