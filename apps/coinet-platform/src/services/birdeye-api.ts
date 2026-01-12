/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🦅 BIRDEYE API SERVICE - Smart Money Tracking                             ║
 * ║                                                                               ║
 * ║   Tracks smart money movements on Solana tokens using Birdeye API.            ║
 * ║   Provides whale wallet analysis, top trader tracking, and smart money flow.  ║
 * ║                                                                               ║
 * ║   API DOCS: https://docs.birdeye.so/                                          ║
 * ║                                                                               ║
 * ║   FEATURES:                                                                   ║
 * ║   • Smart money wallet tracking                                               ║
 * ║   • Top trader analysis                                                        ║
 * ║   • Wallet profitability scoring                                              ║
 * ║   • Recent large transactions                                                 ║
 * ║   • Token holder quality analysis                                             ║
 * ║                                                                               ║
 * ║   @version 1.0.0                                                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Smart money wallet classification
 */
export type WalletTier = 'whale' | 'smart_money' | 'top_trader' | 'regular' | 'new';

/**
 * Wallet trading behavior
 */
export interface WalletProfile {
  address: string;
  tier: WalletTier;
  totalPnl: number;
  winRate: number;
  avgHoldTime: number;       // hours
  totalTrades: number;
  profitableTrades: number;
  avgProfitPercent: number;
  lastActive: Date;
  isKnownSniper: boolean;
  isKnownDumper: boolean;
  tags: string[];
}

/**
 * Token transaction
 */
export interface TokenTransaction {
  signature: string;
  timestamp: Date;
  wallet: string;
  walletTier: WalletTier;
  type: 'buy' | 'sell';
  amountUsd: number;
  amountToken: number;
  priceUsd: number;
  isPotentialSnipe: boolean;
  walletPnl?: number;
}

/**
 * Smart money analysis result
 */
export interface SmartMoneyAnalysis {
  token: string;
  
  // Smart money holdings
  smartMoneyHolders: number;
  smartMoneyHoldingsPercent: number;
  whaleHolders: number;
  whaleHoldingsPercent: number;
  
  // Smart money activity (last 24h)
  smartMoneyBuys: number;
  smartMoneySells: number;
  smartMoneyNetFlow: number;     // Positive = accumulating
  smartMoneyBuyVolume: number;
  smartMoneySellVolume: number;
  
  // Top traders
  topTraderCount: number;
  topTraderAvgPnl: number;
  topTraderSentiment: 'bullish' | 'bearish' | 'neutral';
  
  // Sniper detection
  sniperCount: number;
  sniperHoldingsPercent: number;
  earlyBuyerAvgPnl: number;
  
  // Recent large transactions
  recentLargeTxs: TokenTransaction[];
  largestBuy24h: number;
  largestSell24h: number;
  
  // Signals
  signals: SmartMoneySignal[];
  overallSignal: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
  confidence: number;
  
  // Metadata
  dataTimestamp: Date;
  dataSource: string;
}

/**
 * Smart money signal
 */
export interface SmartMoneySignal {
  type: 'accumulation' | 'distribution' | 'sniper_alert' | 'whale_entry' | 'whale_exit' | 'smart_money_bullish' | 'smart_money_bearish';
  strength: 'strong' | 'moderate' | 'weak';
  description: string;
  confidence: number;
}

/**
 * Token overview from Birdeye
 */
interface BirdeyeTokenOverview {
  address: string;
  decimals: number;
  symbol: string;
  name: string;
  extensions?: {
    twitter?: string;
    website?: string;
    telegram?: string;
  };
  logoURI?: string;
  liquidity: number;
  price: number;
  priceChange24hPercent: number;
  volume24h: number;
  volume24hChangePercent: number;
  mc: number;
  holder: number;
  trade24h: number;
  buy24h: number;
  sell24h: number;
  uniqueWallet24h: number;
  lastTradeUnixTime: number;
}

/**
 * Top trader from Birdeye
 */
interface BirdeyeTopTrader {
  owner: string;
  tokenAddress: string;
  balance: number;
  estimatedValueInSol: number;
  estimatedValueInUsd: number;
  txCount: number;
  buyTxCount: number;
  sellTxCount: number;
  totalBuy: number;
  totalSell: number;
  unrealizedPnl: number;
  realizedPnl: number;
  pnl: number;
  lastTradedAt: number;
}

/**
 * Transaction from Birdeye
 */
interface BirdeyeTransaction {
  txHash: string;
  blockUnixTime: number;
  source: string;
  owner: string;
  from: {
    address: string;
    symbol: string;
    decimals: number;
    amount: number;
    uiAmount: number;
    price: number;
    nearestPrice: number;
  };
  to: {
    address: string;
    symbol: string;
    decimals: number;
    amount: number;
    uiAmount: number;
    price: number;
    nearestPrice: number;
  };
  side: 'buy' | 'sell';
  volumeUSD: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const BIRDEYE_BASE_URL = 'https://public-api.birdeye.so';
const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY || '';

// Rate limiting
const RATE_LIMIT_DELAY_MS = 200;  // 5 req/sec for free tier
let lastRequestTime = 0;

// Cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000;  // 1 minute cache

// Smart money thresholds
const SMART_MONEY_CONFIG = {
  minPnlForSmartMoney: 10000,      // $10K+ lifetime PnL
  minWinRateForSmartMoney: 0.55,   // 55%+ win rate
  minTradesForSmartMoney: 20,       // 20+ trades
  whaleMinHolding: 0.01,           // 1%+ of supply
  largeTransactionUsd: 5000,       // $5K+ is large
  sniperWindowMinutes: 5,          // First 5 min buyers
};

// ============================================================================
// API HELPERS
// ============================================================================

/**
 * Rate-limited fetch with caching
 */
async function birdeyeFetch<T>(
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

  if (!BIRDEYE_API_KEY) {
    logger.debug('🦅 Birdeye API key not configured');
    return null;
  }

  try {
    const response = await fetch(`${BIRDEYE_BASE_URL}${endpoint}`, {
      headers: {
        'X-API-KEY': BIRDEYE_API_KEY,
        'x-chain': 'solana',
      },
    });

    if (!response.ok) {
      if (response.status === 429) {
        logger.warn('🦅 Birdeye rate limit hit');
        return null;
      }
      throw new Error(`Birdeye API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Cache result
    if (cacheKey && data) {
      cache.set(cacheKey, { data, timestamp: Date.now() });
    }

    return data;
  } catch (error) {
    logger.error('🦅 Birdeye API error', {
      endpoint,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// ============================================================================
// API METHODS
// ============================================================================

/**
 * Get token overview
 */
async function getTokenOverview(tokenAddress: string): Promise<BirdeyeTokenOverview | null> {
  const response = await birdeyeFetch<{ data: BirdeyeTokenOverview }>(
    `/defi/token_overview?address=${tokenAddress}`,
    `overview:${tokenAddress}`
  );
  return response?.data || null;
}

/**
 * Get top traders for a token
 */
async function getTopTraders(
  tokenAddress: string,
  limit: number = 20
): Promise<BirdeyeTopTrader[]> {
  const response = await birdeyeFetch<{ data: { items: BirdeyeTopTrader[] } }>(
    `/defi/v2/tokens/${tokenAddress}/top_traders?sort_by=pnl&sort_type=desc&offset=0&limit=${limit}`,
    `traders:${tokenAddress}`
  );
  return response?.data?.items || [];
}

/**
 * Get recent transactions for a token
 */
async function getRecentTransactions(
  tokenAddress: string,
  limit: number = 50
): Promise<BirdeyeTransaction[]> {
  const response = await birdeyeFetch<{ data: { items: BirdeyeTransaction[] } }>(
    `/defi/txs/token?address=${tokenAddress}&offset=0&limit=${limit}&tx_type=swap`,
    `txs:${tokenAddress}`
  );
  return response?.data?.items || [];
}

/**
 * Get token holder list
 */
async function getTokenHolders(
  tokenAddress: string,
  limit: number = 20
): Promise<{ owner: string; balance: number; percentage: number }[]> {
  const response = await birdeyeFetch<{ data: { items: any[] } }>(
    `/defi/v2/tokens/${tokenAddress}/holders?offset=0&limit=${limit}`,
    `holders:${tokenAddress}`
  );
  
  return (response?.data?.items || []).map((h: any) => ({
    owner: h.owner,
    balance: h.balance,
    percentage: h.percentage || 0,
  }));
}

// ============================================================================
// SMART MONEY ANALYSIS
// ============================================================================

/**
 * Classify wallet tier based on trading history
 */
function classifyWallet(trader: BirdeyeTopTrader): WalletTier {
  const { pnl, txCount, buyTxCount, sellTxCount } = trader;
  const winRate = txCount > 0 ? (buyTxCount > sellTxCount ? buyTxCount / txCount : sellTxCount / txCount) : 0;
  
  if (pnl >= SMART_MONEY_CONFIG.minPnlForSmartMoney && 
      winRate >= SMART_MONEY_CONFIG.minWinRateForSmartMoney &&
      txCount >= SMART_MONEY_CONFIG.minTradesForSmartMoney) {
    return 'smart_money';
  }
  
  if (pnl >= SMART_MONEY_CONFIG.minPnlForSmartMoney * 5) {
    return 'whale';
  }
  
  if (pnl >= SMART_MONEY_CONFIG.minPnlForSmartMoney * 0.5 && txCount >= 10) {
    return 'top_trader';
  }
  
  if (txCount < 5) {
    return 'new';
  }
  
  return 'regular';
}

/**
 * Detect potential snipers from early transactions
 */
function detectSnipers(
  transactions: BirdeyeTransaction[],
  tokenCreatedAt?: number
): { count: number; addresses: string[] } {
  if (!tokenCreatedAt || transactions.length === 0) {
    return { count: 0, addresses: [] };
  }

  const sniperWindowEnd = tokenCreatedAt + (SMART_MONEY_CONFIG.sniperWindowMinutes * 60);
  const earlyBuyers = transactions
    .filter(tx => tx.side === 'buy' && tx.blockUnixTime <= sniperWindowEnd)
    .map(tx => tx.owner);

  const uniqueSnipers = [...new Set(earlyBuyers)];
  
  return {
    count: uniqueSnipers.length,
    addresses: uniqueSnipers.slice(0, 10),
  };
}

/**
 * Generate smart money signals
 */
function generateSignals(
  analysis: Partial<SmartMoneyAnalysis>,
  topTraders: BirdeyeTopTrader[]
): SmartMoneySignal[] {
  const signals: SmartMoneySignal[] = [];

  // Smart money accumulation
  if (analysis.smartMoneyNetFlow && analysis.smartMoneyNetFlow > 0) {
    const strength = analysis.smartMoneyNetFlow > 10000 ? 'strong' : 
                     analysis.smartMoneyNetFlow > 5000 ? 'moderate' : 'weak';
    signals.push({
      type: 'accumulation',
      strength,
      description: `Smart money net inflow of $${formatNumber(analysis.smartMoneyNetFlow)} in 24h`,
      confidence: 0.7 + (strength === 'strong' ? 0.2 : strength === 'moderate' ? 0.1 : 0),
    });
  }

  // Smart money distribution
  if (analysis.smartMoneyNetFlow && analysis.smartMoneyNetFlow < 0) {
    const outflow = Math.abs(analysis.smartMoneyNetFlow);
    const strength = outflow > 10000 ? 'strong' : outflow > 5000 ? 'moderate' : 'weak';
    signals.push({
      type: 'distribution',
      strength,
      description: `Smart money net outflow of $${formatNumber(outflow)} in 24h`,
      confidence: 0.7 + (strength === 'strong' ? 0.2 : strength === 'moderate' ? 0.1 : 0),
    });
  }

  // Sniper alert
  if (analysis.sniperCount && analysis.sniperCount > 5) {
    signals.push({
      type: 'sniper_alert',
      strength: analysis.sniperCount > 20 ? 'strong' : analysis.sniperCount > 10 ? 'moderate' : 'weak',
      description: `${analysis.sniperCount} potential snipers detected in first 5 minutes`,
      confidence: 0.6,
    });
  }

  // Whale entry
  const recentWhaleBuys = (analysis.recentLargeTxs || [])
    .filter(tx => tx.type === 'buy' && tx.amountUsd > 10000);
  if (recentWhaleBuys.length > 0) {
    signals.push({
      type: 'whale_entry',
      strength: recentWhaleBuys.length > 3 ? 'strong' : recentWhaleBuys.length > 1 ? 'moderate' : 'weak',
      description: `${recentWhaleBuys.length} large buys (>$10K) in recent transactions`,
      confidence: 0.75,
    });
  }

  // Whale exit
  const recentWhaleSells = (analysis.recentLargeTxs || [])
    .filter(tx => tx.type === 'sell' && tx.amountUsd > 10000);
  if (recentWhaleSells.length > 0) {
    signals.push({
      type: 'whale_exit',
      strength: recentWhaleSells.length > 3 ? 'strong' : recentWhaleSells.length > 1 ? 'moderate' : 'weak',
      description: `${recentWhaleSells.length} large sells (>$10K) in recent transactions`,
      confidence: 0.75,
    });
  }

  // Top trader sentiment
  const profitableTraders = topTraders.filter(t => t.pnl > 0).length;
  const traderSentiment = profitableTraders / Math.max(1, topTraders.length);
  
  if (traderSentiment >= 0.7) {
    signals.push({
      type: 'smart_money_bullish',
      strength: traderSentiment >= 0.85 ? 'strong' : 'moderate',
      description: `${(traderSentiment * 100).toFixed(0)}% of top traders are profitable`,
      confidence: 0.65,
    });
  } else if (traderSentiment <= 0.3) {
    signals.push({
      type: 'smart_money_bearish',
      strength: traderSentiment <= 0.15 ? 'strong' : 'moderate',
      description: `Only ${(traderSentiment * 100).toFixed(0)}% of top traders are profitable`,
      confidence: 0.65,
    });
  }

  return signals;
}

/**
 * Calculate overall signal from individual signals
 */
function calculateOverallSignal(
  signals: SmartMoneySignal[]
): { signal: SmartMoneyAnalysis['overallSignal']; confidence: number } {
  if (signals.length === 0) {
    return { signal: 'neutral', confidence: 0.5 };
  }

  let score = 0;
  let totalWeight = 0;

  for (const signal of signals) {
    const weight = signal.strength === 'strong' ? 3 : signal.strength === 'moderate' ? 2 : 1;
    const value = signal.confidence * weight;

    if (['accumulation', 'whale_entry', 'smart_money_bullish'].includes(signal.type)) {
      score += value;
    } else if (['distribution', 'whale_exit', 'smart_money_bearish', 'sniper_alert'].includes(signal.type)) {
      score -= value;
    }

    totalWeight += weight;
  }

  const normalizedScore = totalWeight > 0 ? score / totalWeight : 0;
  const confidence = Math.min(0.9, 0.5 + Math.abs(normalizedScore) * 0.4);

  let signal: SmartMoneyAnalysis['overallSignal'];
  if (normalizedScore >= 0.5) signal = 'strong_buy';
  else if (normalizedScore >= 0.2) signal = 'buy';
  else if (normalizedScore <= -0.5) signal = 'strong_sell';
  else if (normalizedScore <= -0.2) signal = 'sell';
  else signal = 'neutral';

  return { signal, confidence };
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

/**
 * 🦅 Analyze smart money activity for a Solana token
 */
export async function analyzeSmartMoney(tokenAddress: string): Promise<SmartMoneyAnalysis | null> {
  const startTime = performance.now();

  logger.debug('🦅 Starting Birdeye smart money analysis', {
    token: tokenAddress.slice(0, 8),
  });

  try {
    // Parallel data fetch
    const [overview, topTraders, transactions, holders] = await Promise.all([
      getTokenOverview(tokenAddress),
      getTopTraders(tokenAddress, 30),
      getRecentTransactions(tokenAddress, 100),
      getTokenHolders(tokenAddress, 30),
    ]);

    if (!overview) {
      logger.debug('🦅 Token not found on Birdeye', { token: tokenAddress.slice(0, 8) });
      return null;
    }

    // Classify traders
    const classifiedTraders = topTraders.map(t => ({
      ...t,
      tier: classifyWallet(t),
    }));

    // Calculate smart money metrics
    const smartMoneyTraders = classifiedTraders.filter(t => 
      t.tier === 'smart_money' || t.tier === 'whale'
    );
    
    const whaleTraders = classifiedTraders.filter(t => t.tier === 'whale');

    // Smart money holdings
    const smartMoneyHoldings = smartMoneyTraders.reduce((sum, t) => 
      sum + (t.estimatedValueInUsd || 0), 0
    );
    const smartMoneyHoldingsPercent = overview.mc > 0 
      ? (smartMoneyHoldings / overview.mc) * 100 
      : 0;

    const whaleHoldings = whaleTraders.reduce((sum, t) => 
      sum + (t.estimatedValueInUsd || 0), 0
    );
    const whaleHoldingsPercent = overview.mc > 0 
      ? (whaleHoldings / overview.mc) * 100 
      : 0;

    // Process transactions
    const now = Date.now() / 1000;
    const oneDayAgo = now - 86400;
    const recentTxs = transactions.filter(tx => tx.blockUnixTime >= oneDayAgo);

    // Smart money buys/sells (approximate - based on volume)
    const largeBuys = recentTxs.filter(tx => 
      tx.side === 'buy' && tx.volumeUSD >= SMART_MONEY_CONFIG.largeTransactionUsd
    );
    const largeSells = recentTxs.filter(tx => 
      tx.side === 'sell' && tx.volumeUSD >= SMART_MONEY_CONFIG.largeTransactionUsd
    );

    const smartMoneyBuyVolume = largeBuys.reduce((sum, tx) => sum + tx.volumeUSD, 0);
    const smartMoneySellVolume = largeSells.reduce((sum, tx) => sum + tx.volumeUSD, 0);
    const smartMoneyNetFlow = smartMoneyBuyVolume - smartMoneySellVolume;

    // Detect snipers
    const tokenCreatedAt = overview.lastTradeUnixTime - 86400; // Estimate
    const snipers = detectSnipers(transactions, tokenCreatedAt);

    // Process large transactions for output
    const recentLargeTxs: TokenTransaction[] = [...largeBuys, ...largeSells]
      .slice(0, 10)
      .map(tx => ({
        signature: tx.txHash,
        timestamp: new Date(tx.blockUnixTime * 1000),
        wallet: tx.owner,
        walletTier: 'regular' as WalletTier, // Would need wallet lookup for accuracy
        type: tx.side,
        amountUsd: tx.volumeUSD,
        amountToken: tx.to.uiAmount,
        priceUsd: tx.to.price || 0,
        isPotentialSnipe: false,
      }));

    // Top trader stats
    const topTraderAvgPnl = topTraders.length > 0
      ? topTraders.reduce((sum, t) => sum + t.pnl, 0) / topTraders.length
      : 0;
    
    const profitableCount = topTraders.filter(t => t.pnl > 0).length;
    const topTraderSentiment: SmartMoneyAnalysis['topTraderSentiment'] = 
      profitableCount / Math.max(1, topTraders.length) >= 0.6 ? 'bullish' :
      profitableCount / Math.max(1, topTraders.length) <= 0.4 ? 'bearish' : 'neutral';

    // Build partial analysis for signal generation
    const partialAnalysis: Partial<SmartMoneyAnalysis> = {
      smartMoneyNetFlow,
      sniperCount: snipers.count,
      recentLargeTxs,
    };

    // Generate signals
    const signals = generateSignals(partialAnalysis, topTraders);
    const { signal: overallSignal, confidence } = calculateOverallSignal(signals);

    const analysis: SmartMoneyAnalysis = {
      token: tokenAddress,
      smartMoneyHolders: smartMoneyTraders.length,
      smartMoneyHoldingsPercent,
      whaleHolders: whaleTraders.length,
      whaleHoldingsPercent,
      smartMoneyBuys: largeBuys.length,
      smartMoneySells: largeSells.length,
      smartMoneyNetFlow,
      smartMoneyBuyVolume,
      smartMoneySellVolume,
      topTraderCount: topTraders.length,
      topTraderAvgPnl,
      topTraderSentiment,
      sniperCount: snipers.count,
      sniperHoldingsPercent: 0, // Would need holder analysis
      earlyBuyerAvgPnl: 0, // Would need more data
      recentLargeTxs,
      largestBuy24h: Math.max(0, ...largeBuys.map(tx => tx.volumeUSD)),
      largestSell24h: Math.max(0, ...largeSells.map(tx => tx.volumeUSD)),
      signals,
      overallSignal,
      confidence,
      dataTimestamp: new Date(),
      dataSource: 'Birdeye',
    };

    logger.debug('🦅 Smart money analysis complete', {
      token: tokenAddress.slice(0, 8),
      smartMoneyHolders: analysis.smartMoneyHolders,
      netFlow: analysis.smartMoneyNetFlow,
      signal: analysis.overallSignal,
      processingMs: (performance.now() - startTime).toFixed(1),
    });

    return analysis;

  } catch (error) {
    logger.error('🦅 Smart money analysis failed', {
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
 * Build AI context string from smart money analysis
 */
export function buildSmartMoneyContext(analysis: SmartMoneyAnalysis): string {
  let context = `
🦅 SMART MONEY ANALYSIS (Birdeye):
• Overall Signal: ${analysis.overallSignal.toUpperCase()} (${(analysis.confidence * 100).toFixed(0)}% confidence)
• Smart Money Holders: ${analysis.smartMoneyHolders} (${analysis.smartMoneyHoldingsPercent.toFixed(1)}% of supply)
• Whale Holders: ${analysis.whaleHolders} (${analysis.whaleHoldingsPercent.toFixed(1)}% of supply)

📊 24h Smart Money Flow:
• Net Flow: ${analysis.smartMoneyNetFlow >= 0 ? '+' : ''}$${formatNumber(analysis.smartMoneyNetFlow)}
• Large Buys: ${analysis.smartMoneyBuys} ($${formatNumber(analysis.smartMoneyBuyVolume)})
• Large Sells: ${analysis.smartMoneySells} ($${formatNumber(analysis.smartMoneySellVolume)})
• Largest Buy: $${formatNumber(analysis.largestBuy24h)}
• Largest Sell: $${formatNumber(analysis.largestSell24h)}

👥 Top Traders:
• Count: ${analysis.topTraderCount}
• Avg PnL: $${formatNumber(analysis.topTraderAvgPnl)}
• Sentiment: ${analysis.topTraderSentiment.toUpperCase()}

⚠️ Sniper Detection:
• Early Buyers (first 5 min): ${analysis.sniperCount}
`;

  if (analysis.signals.length > 0) {
    context += `
🔔 Signals:
${analysis.signals.map(s => `  • [${s.strength.toUpperCase()}] ${s.description}`).join('\n')}
`;
  }

  return context.trim();
}

// ============================================================================
// UTILITIES
// ============================================================================

function formatNumber(num: number): string {
  if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toFixed(0);
}

// ============================================================================
// EXPORTS
// ============================================================================

export const birdeyeApi = {
  analyzeSmartMoney,
  getTokenOverview,
  getTopTraders,
  getRecentTransactions,
  getTokenHolders,
  buildSmartMoneyContext,
};

export default birdeyeApi;
