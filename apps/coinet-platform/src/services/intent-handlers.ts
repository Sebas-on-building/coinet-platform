/**
 * COINET AI INTENT HANDLERS
 * 
 * Executes appropriate data fetching and context building based on classified intent.
 * This optimizes API calls by only fetching data relevant to the user's query.
 */

import { logger } from '../utils/logger';
import { IntentClassification, IntentType } from './intent-classifier';

// =============================================================================
// TYPES
// =============================================================================

export interface DataSourceConfig {
  id: string;
  name: string;
  enabled: boolean;
  priority: number;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  timeout?: number;
}

export interface HandlerResult {
  success: boolean;
  context: string;              // Formatted context string for AI
  data: Record<string, any>;   // Raw data fetched
  sources: string[];           // Sources used
  errors?: string[];           // Any errors encountered
  latencyMs: number;
}

export interface HandlerOptions {
  tokens?: string[];
  timeframe?: string;
  forceRefresh?: boolean;
  maxLatencyMs?: number;
}

// =============================================================================
// DATA SOURCE REGISTRY
// =============================================================================

const DATA_SOURCES: DataSourceConfig[] = [
  { id: 'coingecko', name: 'CoinGecko', enabled: true, priority: 1, timeout: 5000 },
  { id: 'dexscreener', name: 'DexScreener', enabled: true, priority: 1, timeout: 5000 },
  { id: 'coinglass', name: 'CoinGlass', enabled: true, priority: 2, timeout: 5000 },
  { id: 'cryptopanic', name: 'CryptoPanic', enabled: true, priority: 2, timeout: 5000 },
  { id: 'lunarcrush', name: 'LunarCrush', enabled: true, priority: 3, timeout: 5000 },
  { id: 'security', name: 'Security Check', enabled: true, priority: 1, timeout: 8000 },
  { id: 'holders', name: 'Holder Analysis', enabled: true, priority: 2, timeout: 8000 },
  { id: 'news', name: 'News Feed', enabled: true, priority: 2, timeout: 5000 },
  { id: 'fear_greed', name: 'Fear & Greed Index', enabled: true, priority: 3, timeout: 3000 },
  { id: 'twitter', name: 'Twitter/X', enabled: true, priority: 3, timeout: 5000 },
];

// =============================================================================
// HANDLER EXECUTION
// =============================================================================

/**
 * Execute the appropriate handler for the given intent
 */
export async function executeHandler(
  message: string,
  classification: IntentClassification,
  options: HandlerOptions = {}
): Promise<HandlerResult> {
  const startTime = Date.now();
  const { intent, dataSources, entities } = classification;
  
  logger.debug('Executing intent handler', { intent, dataSources, entities });
  
  try {
    // Route to appropriate handler based on intent
    let result: HandlerResult;
    
    switch (intent) {
      case 'price_check':
        result = await handlePriceCheck(entities.tokens || [], options);
        break;
        
      case 'market_overview':
        result = await handleMarketOverview(options);
        break;
        
      case 'token_analysis':
      case 'new_coin_analysis':
        result = await handleTokenAnalysis(entities.tokens || [], message, options);
        break;
        
      case 'comparison':
        result = await handleComparison(entities.tokens || [], options);
        break;
        
      case 'news_query':
        result = await handleNewsQuery(entities.tokens, entities.timeframe, options);
        break;
        
      case 'sentiment_query':
        result = await handleSentimentQuery(entities.tokens || [], options);
        break;
        
      case 'decision_help':
        result = await handleDecisionHelp(entities.tokens || [], options);
        break;
        
      case 'greeting':
      case 'gratitude':
      case 'learning':
      case 'general_question':
      case 'clarification':
      case 'unknown':
      default:
        // No data fetching needed for these intents
        result = {
          success: true,
          context: '',
          data: {},
          sources: [],
          latencyMs: Date.now() - startTime,
        };
        break;
    }
    
    result.latencyMs = Date.now() - startTime;
    logger.debug('Handler completed', { intent, latencyMs: result.latencyMs, sources: result.sources });
    
    return result;
    
  } catch (error) {
    logger.error('Handler execution failed', { intent, error });
    return {
      success: false,
      context: '',
      data: {},
      sources: [],
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      latencyMs: Date.now() - startTime,
    };
  }
}

// =============================================================================
// INDIVIDUAL HANDLERS
// =============================================================================

/**
 * Handle price check queries
 */
async function handlePriceCheck(
  tokens: string[],
  options: HandlerOptions
): Promise<HandlerResult> {
  const data: Record<string, any> = {};
  const sources: string[] = [];
  const errors: string[] = [];
  
  // For now, return a placeholder that will be filled by actual data fetching
  // This would integrate with your existing market data services
  
  const contextParts: string[] = [];
  
  if (tokens.length > 0) {
    contextParts.push(`Requested price check for: ${tokens.join(', ')}`);
    contextParts.push('Note: Fetch actual price data from market data service');
  }
  
  return {
    success: true,
    context: contextParts.join('\n'),
    data,
    sources,
    errors: errors.length > 0 ? errors : undefined,
    latencyMs: 0,
  };
}

/**
 * Handle market overview queries
 */
async function handleMarketOverview(
  options: HandlerOptions
): Promise<HandlerResult> {
  const contextParts: string[] = [];
  
  contextParts.push('Market Overview Data Sources:');
  contextParts.push('- BTC/ETH prices and 24h changes');
  contextParts.push('- Fear & Greed Index');
  contextParts.push('- Market dominance');
  contextParts.push('- Notable movers');
  
  return {
    success: true,
    context: contextParts.join('\n'),
    data: {},
    sources: ['coingecko', 'coinglass'],
    latencyMs: 0,
  };
}

/**
 * Handle token analysis queries
 */
async function handleTokenAnalysis(
  tokens: string[],
  message: string,
  options: HandlerOptions
): Promise<HandlerResult> {
  const contextParts: string[] = [];
  
  if (tokens.length > 0) {
    contextParts.push(`Token Analysis for: ${tokens.join(', ')}`);
    contextParts.push('Data to fetch:');
    contextParts.push('- Price, volume, liquidity (DexScreener/CoinGecko)');
    contextParts.push('- Security audit (RugCheck/GoPlus)');
    contextParts.push('- Holder distribution');
    contextParts.push('- Social sentiment');
  }
  
  // Check for contract address in message
  const evmAddress = message.match(/0x[a-fA-F0-9]{40}/);
  const solanaAddress = message.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
  
  if (evmAddress) {
    contextParts.push(`Detected EVM contract: ${evmAddress[0]}`);
  }
  if (solanaAddress && !evmAddress) {
    contextParts.push(`Detected Solana address: ${solanaAddress[0]}`);
  }
  
  return {
    success: true,
    context: contextParts.join('\n'),
    data: { tokens, hasContractAddress: !!(evmAddress || solanaAddress) },
    sources: ['dexscreener', 'coingecko', 'security'],
    latencyMs: 0,
  };
}

/**
 * Handle comparison queries
 */
async function handleComparison(
  tokens: string[],
  options: HandlerOptions
): Promise<HandlerResult> {
  if (tokens.length < 2) {
    return {
      success: true,
      context: 'Comparison requested but less than 2 tokens detected. May need clarification.',
      data: { tokens },
      sources: [],
      latencyMs: 0,
    };
  }
  
  return {
    success: true,
    context: `Comparison requested for: ${tokens.join(' vs ')}`,
    data: { tokens },
    sources: ['coingecko', 'dexscreener'],
    latencyMs: 0,
  };
}

/**
 * Handle news queries
 */
async function handleNewsQuery(
  tokens: string[] | undefined,
  timeframe: string | undefined,
  options: HandlerOptions
): Promise<HandlerResult> {
  const contextParts: string[] = ['News Query:'];
  
  if (tokens && tokens.length > 0) {
    contextParts.push(`- Focus: ${tokens.join(', ')}`);
  }
  if (timeframe) {
    contextParts.push(`- Timeframe: ${timeframe}`);
  }
  contextParts.push('- Sources: CryptoPanic, News APIs');
  
  return {
    success: true,
    context: contextParts.join('\n'),
    data: { tokens, timeframe },
    sources: ['cryptopanic', 'news'],
    latencyMs: 0,
  };
}

/**
 * Handle sentiment queries
 */
async function handleSentimentQuery(
  tokens: string[],
  options: HandlerOptions
): Promise<HandlerResult> {
  return {
    success: true,
    context: `Sentiment analysis requested for: ${tokens.length > 0 ? tokens.join(', ') : 'general market'}`,
    data: { tokens },
    sources: ['lunarcrush', 'twitter'],
    latencyMs: 0,
  };
}

/**
 * Handle decision help queries (should I buy/sell)
 */
async function handleDecisionHelp(
  tokens: string[],
  options: HandlerOptions
): Promise<HandlerResult> {
  const contextParts: string[] = [];
  
  contextParts.push('Decision Help Request');
  contextParts.push('IMPORTANT: Do NOT provide buy/sell recommendations.');
  contextParts.push('Instead, provide:');
  contextParts.push('- Current market data and trends');
  contextParts.push('- Risk factors to consider');
  contextParts.push('- Key metrics and their meaning');
  contextParts.push('- Questions the user should ask themselves');
  
  if (tokens.length > 0) {
    contextParts.push(`Tokens in question: ${tokens.join(', ')}`);
  }
  
  return {
    success: true,
    context: contextParts.join('\n'),
    data: { tokens, isDecisionHelp: true },
    sources: ['dexscreener', 'coingecko', 'news', 'sentiment'],
    latencyMs: 0,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get available data sources
 */
export function getAvailableDataSources(): DataSourceConfig[] {
  return DATA_SOURCES.filter(s => s.enabled);
}

/**
 * Check if a specific data source is available
 */
export function isDataSourceAvailable(sourceId: string): boolean {
  const source = DATA_SOURCES.find(s => s.id === sourceId);
  return source?.enabled ?? false;
}

/**
 * Format handler result as context string for AI
 */
export function formatHandlerContext(result: HandlerResult): string {
  if (!result.success) {
    return `[Data fetch failed: ${result.errors?.join(', ') || 'Unknown error'}]`;
  }
  
  if (!result.context) {
    return '';
  }
  
  let context = result.context;
  
  if (result.sources.length > 0) {
    context += `\n\n[Sources: ${result.sources.join(', ')}]`;
  }
  
  return context;
}
