/**
 * COINET TOKEN CONTEXT SERVICE
 * 
 * Handles token entity detection, resolution, and context enrichment.
 * This enables accurate token identification and data fetching for analysis.
 */

import { logger } from '../utils/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface TokenContext {
  resolved: boolean;
  token: ResolvedToken | null;
  candidates: TokenCandidate[];
  confidence: number;
  source: 'address' | 'ticker' | 'name' | 'url' | 'unknown';
  chain?: string;
  needsClarification: boolean;
  clarificationQuestion?: string;
  rawInput: string;
}

export interface ResolvedToken {
  symbol: string;
  name: string;
  address: string;
  chain: string;
  decimals?: number;
  logoUrl?: string;
  coingeckoId?: string;
  dexscreenerId?: string;
}

export interface TokenCandidate {
  symbol: string;
  name: string;
  address: string;
  chain: string;
  confidence: number;
  liquidity?: number;
  volume24h?: number;
  reason: string;
}

export interface TokenContextResult {
  hasTokenContext: boolean;
  tokenContext: TokenContext | null;
  injectionText: string | null;
}

// =============================================================================
// DETECTION PATTERNS
// =============================================================================

// EVM contract address (0x...)
const EVM_ADDRESS_PATTERN = /\b0x[a-fA-F0-9]{40}\b/g;

// Solana address (base58, 32-44 chars)
const SOLANA_ADDRESS_PATTERN = /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/g;

// Ticker symbols ($BTC, $ETH, etc.)
const TICKER_PATTERN = /\$([A-Z]{2,10})\b/gi;

// Common ticker mentions without $
const COMMON_TICKERS = /\b(BTC|ETH|SOL|BNB|XRP|ADA|DOGE|SHIB|MATIC|DOT|AVAX|LINK|UNI|ATOM|LTC|PEPE|WIF|BONK|JUP|PYTH)\b/gi;

// DexScreener URL pattern
const DEXSCREENER_URL_PATTERN = /dexscreener\.com\/([a-z]+)\/([a-zA-Z0-9]+)/i;

// Pump.fun URL pattern
const PUMPFUN_URL_PATTERN = /pump\.fun\/([a-zA-Z0-9]+)/i;

// Birdeye URL pattern
const BIRDEYE_URL_PATTERN = /birdeye\.so\/token\/([a-zA-Z0-9]+)/i;

// =============================================================================
// CHAIN DETECTION
// =============================================================================

const CHAIN_KEYWORDS: Record<string, string[]> = {
  ethereum: ['ethereum', 'eth', 'erc20', 'erc-20', 'mainnet'],
  solana: ['solana', 'sol', 'spl', 'pump.fun', 'raydium', 'jupiter'],
  bsc: ['bsc', 'binance', 'bnb', 'bep20', 'bep-20', 'pancake'],
  polygon: ['polygon', 'matic', 'poly'],
  arbitrum: ['arbitrum', 'arb'],
  base: ['base'],
  avalanche: ['avalanche', 'avax'],
  optimism: ['optimism', 'op'],
};

// =============================================================================
// MAIN FUNCTIONS
// =============================================================================

/**
 * Check if a message contains any token reference
 */
export function messageContainsTokenRef(message: string): boolean {
  // Check for contract addresses
  if (EVM_ADDRESS_PATTERN.test(message)) return true;
  if (SOLANA_ADDRESS_PATTERN.test(message)) return true;
  
  // Check for ticker symbols
  if (TICKER_PATTERN.test(message)) return true;
  if (COMMON_TICKERS.test(message)) return true;
  
  // Check for DEX URLs
  if (DEXSCREENER_URL_PATTERN.test(message)) return true;
  if (PUMPFUN_URL_PATTERN.test(message)) return true;
  if (BIRDEYE_URL_PATTERN.test(message)) return true;
  
  return false;
}

/**
 * Enrich a message with token context
 * Returns the context result with resolved token info or clarification needs
 */
export async function enrichMessageWithTokenContext(
  message: string,
  conversationContext?: {
    previousTokens?: ResolvedToken[];
    preferredChain?: string;
  }
): Promise<TokenContextResult> {
  try {
    const tokenContext = await detectAndResolveToken(message, conversationContext);
    
    if (!tokenContext.resolved && !tokenContext.needsClarification) {
      return {
        hasTokenContext: false,
        tokenContext: null,
        injectionText: null,
      };
    }
    
    // Build injection text for the AI
    let injectionText = '';
    
    if (tokenContext.resolved && tokenContext.token) {
      injectionText = buildTokenContextInjection(tokenContext);
    } else if (tokenContext.needsClarification) {
      injectionText = buildClarificationInjection(tokenContext);
    }
    
    return {
      hasTokenContext: true,
      tokenContext,
      injectionText,
    };
    
  } catch (error) {
    logger.error('Failed to enrich message with token context', { error, message });
    return {
      hasTokenContext: false,
      tokenContext: null,
      injectionText: null,
    };
  }
}

/**
 * Detect and resolve token from message
 */
async function detectAndResolveToken(
  message: string,
  context?: {
    previousTokens?: ResolvedToken[];
    preferredChain?: string;
  }
): Promise<TokenContext> {
  const lowerMessage = message.toLowerCase();
  
  // Try to detect chain from context
  let detectedChain = context?.preferredChain || detectChain(message);
  
  // 1. Check for EVM contract address
  const evmMatch = message.match(EVM_ADDRESS_PATTERN);
  if (evmMatch) {
    return {
      resolved: true,
      token: {
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        address: evmMatch[0],
        chain: detectedChain || 'ethereum',
      },
      candidates: [],
      confidence: 0.95,
      source: 'address',
      chain: detectedChain || 'ethereum',
      needsClarification: false,
      rawInput: evmMatch[0],
    };
  }
  
  // 2. Check for Solana address
  const solanaMatch = message.match(SOLANA_ADDRESS_PATTERN);
  if (solanaMatch && !evmMatch) {
    // Filter out common false positives (words that look like base58)
    const potentialAddress = solanaMatch[0];
    if (potentialAddress.length >= 32 && !isCommonWord(potentialAddress)) {
      return {
        resolved: true,
        token: {
          symbol: 'UNKNOWN',
          name: 'Unknown Token',
          address: potentialAddress,
          chain: 'solana',
        },
        candidates: [],
        confidence: 0.9,
        source: 'address',
        chain: 'solana',
        needsClarification: false,
        rawInput: potentialAddress,
      };
    }
  }
  
  // 3. Check for DexScreener URL
  const dexMatch = message.match(DEXSCREENER_URL_PATTERN);
  if (dexMatch) {
    return {
      resolved: true,
      token: {
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        address: dexMatch[2],
        chain: dexMatch[1],
      },
      candidates: [],
      confidence: 0.95,
      source: 'url',
      chain: dexMatch[1],
      needsClarification: false,
      rawInput: dexMatch[0],
    };
  }
  
  // 4. Check for pump.fun URL
  const pumpMatch = message.match(PUMPFUN_URL_PATTERN);
  if (pumpMatch) {
    return {
      resolved: true,
      token: {
        symbol: 'UNKNOWN',
        name: 'Unknown Token',
        address: pumpMatch[1],
        chain: 'solana',
      },
      candidates: [],
      confidence: 0.95,
      source: 'url',
      chain: 'solana',
      needsClarification: false,
      rawInput: pumpMatch[0],
    };
  }
  
  // 5. Check for ticker symbols
  const tickerMatches: string[] = [];
  
  // $TICKER format
  const dollarTickers = message.matchAll(/\$([A-Z]{2,10})\b/gi);
  for (const match of dollarTickers) {
    tickerMatches.push(match[1].toUpperCase());
  }
  
  // Common tickers without $
  const commonMatches = message.matchAll(COMMON_TICKERS);
  for (const match of commonMatches) {
    const ticker = match[0].toUpperCase();
    if (!tickerMatches.includes(ticker)) {
      tickerMatches.push(ticker);
    }
  }
  
  if (tickerMatches.length === 1) {
    const ticker = tickerMatches[0];
    const knownToken = getKnownToken(ticker);
    
    if (knownToken) {
      return {
        resolved: true,
        token: knownToken,
        candidates: [],
        confidence: 0.9,
        source: 'ticker',
        chain: knownToken.chain,
        needsClarification: false,
        rawInput: ticker,
      };
    }
    
    // Unknown ticker - might need clarification
    return {
      resolved: false,
      token: null,
      candidates: [],
      confidence: 0.5,
      source: 'ticker',
      needsClarification: true,
      clarificationQuestion: `Which "${ticker}" are you referring to? Please provide the contract address or specify the chain.`,
      rawInput: ticker,
    };
  }
  
  if (tickerMatches.length > 1) {
    // Multiple tickers - likely a comparison
    return {
      resolved: false,
      token: null,
      candidates: tickerMatches.map(t => ({
        symbol: t,
        name: t,
        address: '',
        chain: 'unknown',
        confidence: 0.7,
        reason: 'Detected ticker in message',
      })),
      confidence: 0.7,
      source: 'ticker',
      needsClarification: false,
      rawInput: tickerMatches.join(', '),
    };
  }
  
  // No token detected
  return {
    resolved: false,
    token: null,
    candidates: [],
    confidence: 0,
    source: 'unknown',
    needsClarification: false,
    rawInput: '',
  };
}

/**
 * Detect chain from message context
 */
function detectChain(message: string): string | undefined {
  const lowerMessage = message.toLowerCase();
  
  for (const [chain, keywords] of Object.entries(CHAIN_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerMessage.includes(keyword)) {
        return chain;
      }
    }
  }
  
  return undefined;
}

/**
 * Check if a string is a common word (false positive filter)
 */
function isCommonWord(str: string): boolean {
  const commonWords = [
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
    'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
    'how', 'its', 'may', 'new', 'now', 'old', 'see', 'way', 'who', 'boy',
    'did', 'own', 'say', 'she', 'too', 'use', 'your', 'each', 'from',
    'have', 'been', 'call', 'come', 'could', 'find', 'first', 'into',
    'long', 'look', 'made', 'make', 'many', 'more', 'most', 'need',
    'number', 'over', 'part', 'people', 'than', 'that', 'them', 'then',
    'there', 'these', 'they', 'this', 'time', 'very', 'want', 'water',
    'when', 'where', 'which', 'will', 'with', 'word', 'work', 'would',
    'write', 'about', 'after', 'again', 'being', 'between', 'both',
  ];
  return commonWords.includes(str.toLowerCase());
}

/**
 * Get known token info for common tickers
 */
function getKnownToken(ticker: string): ResolvedToken | null {
  const knownTokens: Record<string, ResolvedToken> = {
    BTC: { symbol: 'BTC', name: 'Bitcoin', address: 'bitcoin', chain: 'bitcoin', coingeckoId: 'bitcoin' },
    ETH: { symbol: 'ETH', name: 'Ethereum', address: 'ethereum', chain: 'ethereum', coingeckoId: 'ethereum' },
    SOL: { symbol: 'SOL', name: 'Solana', address: 'solana', chain: 'solana', coingeckoId: 'solana' },
    BNB: { symbol: 'BNB', name: 'BNB', address: 'binancecoin', chain: 'bsc', coingeckoId: 'binancecoin' },
    XRP: { symbol: 'XRP', name: 'XRP', address: 'ripple', chain: 'ripple', coingeckoId: 'ripple' },
    ADA: { symbol: 'ADA', name: 'Cardano', address: 'cardano', chain: 'cardano', coingeckoId: 'cardano' },
    DOGE: { symbol: 'DOGE', name: 'Dogecoin', address: 'dogecoin', chain: 'dogecoin', coingeckoId: 'dogecoin' },
    SHIB: { symbol: 'SHIB', name: 'Shiba Inu', address: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE', chain: 'ethereum', coingeckoId: 'shiba-inu' },
    MATIC: { symbol: 'MATIC', name: 'Polygon', address: 'matic-network', chain: 'polygon', coingeckoId: 'matic-network' },
    DOT: { symbol: 'DOT', name: 'Polkadot', address: 'polkadot', chain: 'polkadot', coingeckoId: 'polkadot' },
    AVAX: { symbol: 'AVAX', name: 'Avalanche', address: 'avalanche-2', chain: 'avalanche', coingeckoId: 'avalanche-2' },
    LINK: { symbol: 'LINK', name: 'Chainlink', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', chain: 'ethereum', coingeckoId: 'chainlink' },
    UNI: { symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', chain: 'ethereum', coingeckoId: 'uniswap' },
    ATOM: { symbol: 'ATOM', name: 'Cosmos', address: 'cosmos', chain: 'cosmos', coingeckoId: 'cosmos' },
    LTC: { symbol: 'LTC', name: 'Litecoin', address: 'litecoin', chain: 'litecoin', coingeckoId: 'litecoin' },
    PEPE: { symbol: 'PEPE', name: 'Pepe', address: '0x6982508145454Ce325dDbE47a25d4ec3d2311933', chain: 'ethereum', coingeckoId: 'pepe' },
    WIF: { symbol: 'WIF', name: 'dogwifhat', address: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', chain: 'solana', coingeckoId: 'dogwifcoin' },
    BONK: { symbol: 'BONK', name: 'Bonk', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', chain: 'solana', coingeckoId: 'bonk' },
    JUP: { symbol: 'JUP', name: 'Jupiter', address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', chain: 'solana', coingeckoId: 'jupiter-exchange-solana' },
    PYTH: { symbol: 'PYTH', name: 'Pyth Network', address: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3', chain: 'solana', coingeckoId: 'pyth-network' },
  };
  
  return knownTokens[ticker.toUpperCase()] || null;
}

/**
 * Build token context injection text for AI
 */
function buildTokenContextInjection(context: TokenContext): string {
  if (!context.token) return '';
  
  const { token } = context;
  const parts: string[] = [
    '=== TOKEN CONTEXT ===',
    `Symbol: ${token.symbol}`,
    `Name: ${token.name}`,
    `Chain: ${token.chain}`,
  ];
  
  if (token.address && token.address !== token.symbol.toLowerCase()) {
    parts.push(`Address: ${token.address}`);
  }
  
  if (token.coingeckoId) {
    parts.push(`CoinGecko ID: ${token.coingeckoId}`);
  }
  
  parts.push(`Resolution confidence: ${(context.confidence * 100).toFixed(0)}%`);
  parts.push(`Source: ${context.source}`);
  parts.push('===================');
  
  return parts.join('\n');
}

/**
 * Build clarification injection text for AI
 */
function buildClarificationInjection(context: TokenContext): string {
  const parts: string[] = [
    '=== TOKEN RESOLUTION NEEDED ===',
    `Detected input: ${context.rawInput}`,
    `Confidence: ${(context.confidence * 100).toFixed(0)}%`,
  ];
  
  if (context.candidates.length > 0) {
    parts.push('Possible matches:');
    for (const candidate of context.candidates.slice(0, 3)) {
      parts.push(`  - ${candidate.symbol} (${candidate.chain}): ${candidate.reason}`);
    }
  }
  
  if (context.clarificationQuestion) {
    parts.push(`\nASK USER: ${context.clarificationQuestion}`);
  }
  
  parts.push('==============================');
  
  return parts.join('\n');
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  detectChain,
  getKnownToken,
  EVM_ADDRESS_PATTERN,
  SOLANA_ADDRESS_PATTERN,
  TICKER_PATTERN,
};
