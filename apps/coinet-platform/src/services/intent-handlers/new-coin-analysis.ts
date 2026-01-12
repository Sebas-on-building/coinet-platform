/**
 * 🚀 New Coin Analysis Handler - Meme Coin Intelligence v3.0
 * 
 * Handles queries about new tokens, pump.fun coins, and degen plays.
 * Integrates with the meme-coin-intelligence scoring engine for
 * comprehensive risk/potential analysis.
 * 
 * Response Shape: Meme Verdict
 * Data Depth: Full (needs all security checks)
 * 
 * Examples:
 * - "Check this coin 3QrGcwFSKXiKetD5ixzZa7H4zHPuTg8grrH7s5Mzpump"
 * - "Is this a scam? [contract address]"
 * - "Should I ape into this pump.fun token?"
 * - "Rug check this address"
 * 
 * @version 3.0.0 - Integrated with meme-coin-scoring-engine
 */

import { IntentClassification } from '../intent-classifier';
import { HandlerResult, createMinimalDataSources, DataSourceConfig } from './index';
import { symbolDetector, DetectedContractAddress } from '../symbol-detector';
import { analyzeMemeToken, MemeCoinAnalysis } from '../meme-coin-intelligence';
import { logger } from '../../utils/logger';

/**
 * Context extracted for new coin analysis
 */
export interface NewCoinAnalysisContext {
  contractAddresses: DetectedContractAddress[];
  isScamCheck: boolean;
  isPotentialCheck: boolean;
  wantsPriceRange: boolean;
  isApeQuestion: boolean;
  chain: 'solana' | 'ethereum' | 'bsc' | 'base' | 'unknown';
  memeCoinAnalysis?: MemeCoinAnalysis;  // 🆕 Full analysis result
}

/**
 * Patterns to detect specific query types
 */
const SCAM_CHECK_PATTERNS = [
  /\b(?:scam|rug|honeypot|legit|safe)\b/i,
  /\brug ?(?:check|pull)\b/i,
  /\bis (?:this|it) (?:a )?scam\b/i,
];

const POTENTIAL_CHECK_PATTERNS = [
  /\bpotential\b/i,
  /\bworth\b/i,
  /\bmoon\b/i,
  /\bgem\b/i,
  /\b(?:could|will) (?:this|it) (?:pump|moon|10x|100x)\b/i,
];

const PRICE_RANGE_PATTERNS = [
  /\bprice (?:range|target|prediction)\b/i,
  /\bhow (?:high|far) (?:can|could|will)\b/i,
  /\b(?:downside|upside)\b/i,
  /\bwhere (?:can|could|will) (?:this|it) go\b/i,
];

const APE_PATTERNS = [
  /\bshould i (?:ape|buy|enter)\b/i,
  /\bworth (?:aping|buying)\b/i,
  /\bape (?:in|into)\b/i,
  /\bfomo\b/i,
];

/**
 * New Coin Analysis Handler
 * 
 * Fetches comprehensive data for meme coin analysis using the 
 * meme-coin-intelligence scoring engine:
 * - DexScreener data (price, liquidity, volume, age)
 * - Pump.fun API (bonding curve, creator, community)
 * - Solscan API (holder distribution, whales)
 * - Security scan (honeypot, mintable, taxes)
 * - Advanced scoring with trading recommendations
 * 
 * Skips traditional OmniScore (not relevant for new coins)
 */
export async function newCoinAnalysisHandler(
  message: string,
  classification: IntentClassification,
  detectedCoins: string[]
): Promise<HandlerResult> {
  const lowerMessage = message.toLowerCase();
  
  // Detect contract addresses in the message
  const contractAddresses = symbolDetector.detectContractAddresses(message);
  
  // Determine what type of analysis is requested
  const isScamCheck = SCAM_CHECK_PATTERNS.some(p => p.test(message));
  const isPotentialCheck = POTENTIAL_CHECK_PATTERNS.some(p => p.test(message));
  const wantsPriceRange = PRICE_RANGE_PATTERNS.some(p => p.test(message));
  const isApeQuestion = APE_PATTERNS.some(p => p.test(message));
  
  // Detect chain context
  let chain: 'solana' | 'ethereum' | 'bsc' | 'base' | 'unknown' = 'unknown';
  if (contractAddresses.length > 0) {
    chain = contractAddresses[0].chain as typeof chain;
  } else if (lowerMessage.includes('pump.fun') || lowerMessage.includes('raydium')) {
    chain = 'solana';
  } else if (lowerMessage.includes('uniswap') || lowerMessage.includes('ethereum')) {
    chain = 'ethereum';
  } else if (lowerMessage.includes('pancake') || lowerMessage.includes('bsc')) {
    chain = 'bsc';
  } else if (lowerMessage.includes('base')) {
    chain = 'base';
  }

  // Build data source config - focused on what matters for new coins
  const dataSources: DataSourceConfig = createMinimalDataSources();
  
  // Enable sources needed for meme coin analysis
  dataSources.fetchMarketData = true;      // Basic price data as fallback
  dataSources.fetchEnterpriseData = false; // Not relevant for new coins
  dataSources.fetchWhaleData = false;      // Handled by Solscan in our engine
  dataSources.fetchNews = false;           // New coins rarely have news
  dataSources.fetchSentiment = false;      // Not relevant for micro caps
  dataSources.fetchSocial = false;         // Handled by pump.fun API
  dataSources.fetchDerivatives = false;    // New coins don't have derivatives
  dataSources.fetchInfluencer = false;     // TODO: Enable for CT mentions
  dataSources.fetchOmniScore = false;      // OmniScore not relevant for new coins
  dataSources.fetchBehavioral = false;     // Not applicable
  dataSources.fetchNeuroeconomic = false;  // Not applicable
  dataSources.fetchInvestigation = true;   // Triggers meme coin analysis
  
  // ========================================================================
  // 🚀 RUN MEME COIN ANALYSIS if contract address detected
  // ========================================================================
  let memeCoinAnalysis: MemeCoinAnalysis | null = null;
  
  if (contractAddresses.length > 0) {
    const addressInfo = contractAddresses[0];
    
    logger.info('🚀 Running meme coin analysis for handler', {
      address: addressInfo.address.slice(0, 8) + '...',
      chain: addressInfo.chain,
      isPumpFun: addressInfo.isPumpFun,
    });
    
    try {
      memeCoinAnalysis = await analyzeMemeToken(addressInfo, {
        includeSecurityScan: true,
        includePriceRange: wantsPriceRange || isApeQuestion,
      });
      
      logger.info('🚀 Meme coin analysis complete', {
        address: addressInfo.address.slice(0, 8),
        riskScore: memeCoinAnalysis.riskScore,
        potentialScore: memeCoinAnalysis.potentialScore,
        recommendation: memeCoinAnalysis.tradingRecommendation?.action,
        processingMs: memeCoinAnalysis.processingTimeMs,
      });
    } catch (error) {
      logger.error('🚀 Meme coin analysis failed in handler', {
        address: addressInfo.address,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // Build the AI format hint with analysis data
  const formatHint = buildFormatHint({
    contractAddresses,
    isScamCheck,
    isPotentialCheck,
    wantsPriceRange,
    isApeQuestion,
    chain,
    memeCoinAnalysis: memeCoinAnalysis || undefined,
  });

  // Build response guidance
  let responseGuidance = 'Meme coin analysis';
  if (contractAddresses.length > 0) {
    const addr = contractAddresses[0];
    responseGuidance = `New coin analysis: ${addr.address.slice(0, 8)}...${addr.address.slice(-4)} on ${addr.chain}`;
    if (addr.isPumpFun) {
      responseGuidance += ' (pump.fun)';
    }
    if (memeCoinAnalysis?.tradingRecommendation) {
      responseGuidance += ` [${memeCoinAnalysis.tradingRecommendation.action}]`;
    }
  }
  
  if (isScamCheck) responseGuidance += ' [SCAM CHECK]';
  if (isPotentialCheck) responseGuidance += ' [POTENTIAL CHECK]';
  if (wantsPriceRange) responseGuidance += ' [PRICE RANGE]';
  if (isApeQuestion) responseGuidance += ' [APE QUESTION]';

  return {
    dataSources,
    aiFormatHint: formatHint,
    contextPriority: ['memeCoinAnalysis', 'securityScan', 'marketData'],
    maxContextTokens: 4000,  // Need room for detailed analysis
    responseGuidance,
  };
}

/**
 * Build format hint for AI based on query type and analysis results
 */
function buildFormatHint(context: NewCoinAnalysisContext): string {
  const { 
    contractAddresses, 
    isScamCheck, 
    isPotentialCheck, 
    wantsPriceRange, 
    isApeQuestion, 
    chain,
    memeCoinAnalysis 
  } = context;
  
  // Start with base guidance
  let hint = `INTENT-AWARE RESPONSE GUIDANCE: Meme Coin Verdict Mode

The user is asking about a new/meme coin. They need fast, actionable intel.
${contractAddresses.length > 0 
  ? `CONTRACT DETECTED: ${contractAddresses[0].address} on ${chain}${contractAddresses[0].isPumpFun ? ' (pump.fun token)' : ''}`
  : 'No contract address detected - search by ticker/name'}

QUERY TYPE:
${isScamCheck ? '• SCAM CHECK requested - prioritize red flags and security issues' : ''}
${isPotentialCheck ? '• POTENTIAL CHECK requested - assess upside and momentum signals' : ''}
${wantsPriceRange ? '• PRICE RANGE requested - provide downside/base/upside scenarios' : ''}
${isApeQuestion ? '• APE QUESTION - they want your honest recommendation' : ''}
`;

  // ========================================================================
  // 🚀 INJECT MEME COIN ANALYSIS DATA
  // ========================================================================
  if (memeCoinAnalysis) {
    hint += `
═══════════════════════════════════════════════════════════════════════════════
📊 MEME COIN ANALYSIS DATA (use this as your source of truth)
═══════════════════════════════════════════════════════════════════════════════

${memeCoinAnalysis.rawContext}

`;
  }

  // Add response format guidance
  hint += `
HOW TO RESPOND:

1. OPENING VERDICT (1-2 sentences)
   Start with your honest take: "This one's actually not terrible..." or "Stay far away from this..."

2. KEY STATS (quick glance format)
   ${contractAddresses[0]?.isPumpFun ? '[TOKEN] — pump.fun' : '[TOKEN] — [CHAIN]'}
   
   🎯 Risk Score: XX/100 ([LEVEL])
   📈 Potential: XX/100 ([LEVEL])
   
   Key Stats:
   • Price: $X.XXXXX | MCap: $XXK | Liq: $XXK
   • Age: X hours | Holders: XXX
   • 24h: Buys XX / Sells XX

3. RED FLAGS (⚠️)
   List 2-3 most important warnings in natural language.

4. POSITIVE SIGNALS (✅)
   List 2-3 good signs if they exist.

5. PRICE RANGE (💰) ${!wantsPriceRange ? '(only if relevant)' : ''}
   • Downside: $X.XXX (-XX%) — what happens if it dumps
   • Base: $X.XXX - $X.XXX — consolidation range
   • Upside: $X.XXX (+XXX%) — if momentum continues

6. YOUR TAKE + QUESTION
   End with what you'd personally do and ask about their situation.

TONE: Be a knowledgeable degen friend. Direct, no fluff, honest about risks but not preachy.
`;

  // Add scam-specific guidance
  if (isScamCheck) {
    hint += `
SCAM CHECK PRIORITY:
- Check for honeypot indicators
- Look at sell/buy tax
- Verify liquidity isn't fake
- Check if dev/creator dumped
- Look at holder concentration
- Age of token (< 1 hour = extreme caution)
`;
  }

  // Add ape question guidance
  if (isApeQuestion) {
    hint += `
APE QUESTION RESPONSE:
- Give a clear YES/NO/MAYBE with conditions
- Size recommendation based on the trading recommendation
- Entry strategy if bullish
- Stop loss level if applicable
`;
  }

  return hint;
}

/**
 * Export context type for use in chat service
 */
export { NewCoinAnalysisContext };
