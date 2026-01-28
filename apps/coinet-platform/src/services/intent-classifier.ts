/**
 * COINET AI INTENT CLASSIFIER
 * 
 * Classifies user messages into intents for optimized response handling.
 * This enables targeted data fetching and appropriate response formatting.
 */

import { logger } from '../utils/logger';

// =============================================================================
// INTENT TYPES
// =============================================================================

export type IntentType =
  | 'price_check'           // Simple price inquiry
  | 'market_overview'       // General market status
  | 'token_analysis'        // Deep token analysis
  | 'new_coin_analysis'     // Analysis of a new/meme token
  | 'comparison'            // Compare multiple tokens
  | 'news_query'            // News-related question
  | 'technical_analysis'    // TA-related question
  | 'sentiment_query'       // Sentiment/social question
  | 'portfolio_query'       // Portfolio-related
  | 'learning'              // Educational question
  | 'decision_help'         // Should I buy/sell type question
  | 'greeting'              // Hello, hi, etc.
  | 'gratitude'             // Thanks, etc.
  | 'clarification'         // Follow-up or clarifying question
  | 'general_question'      // General crypto question
  | 'unknown';              // Cannot classify

export interface IntentClassification {
  intent: IntentType;
  confidence: number;       // 0-1 confidence score
  entities: {
    tokens?: string[];      // Detected token symbols/names
    timeframe?: string;     // Detected timeframe (today, this week, etc.)
    comparison?: boolean;   // Is this a comparison query?
    sentiment?: string;     // Detected sentiment keywords
  };
  suggestedDepth: 'minimal' | 'quick' | 'standard' | 'deep';
  requiresLiveData: boolean;
  dataSources: string[];    // Which data sources to query
}

// =============================================================================
// CLASSIFICATION PATTERNS
// =============================================================================

const INTENT_PATTERNS: Record<IntentType, RegExp[]> = {
  price_check: [
    /\bprice\s+of\b/i,
    /\bhow\s+much\s+is\b/i,
    /\bwhat('s|s|\s+is)\s+(the\s+)?price\b/i,
    /\bcurrent\s+price\b/i,
    /\bprice\s+check\b/i,
    /\bworth\b/i,
  ],
  market_overview: [
    /\bmarket\s+(overview|status|condition|update)\b/i,
    /\bhow('s|s|\s+is)\s+(the\s+)?market\b/i,
    /\bmarket\s+doing\b/i,
    /\bwhat('s|s)\s+happening\s+(in\s+)?(the\s+)?market\b/i,
    /\bmarket\s+sentiment\b/i,
  ],
  token_analysis: [
    /\banalyze\b/i,
    /\banalysis\s+of\b/i,
    /\bwhat\s+do\s+you\s+think\s+(about|of)\b/i,
    /\btell\s+me\s+about\b/i,
    /\bbreakdown\b/i,
    /\bdeep\s+dive\b/i,
  ],
  new_coin_analysis: [
    /\bnew\s+(coin|token|project)\b/i,
    /\bmeme\s*(coin|token)?\b/i,
    /\bjust\s+launched\b/i,
    /\bpump\.?fun\b/i,
    /\bdexscreener\b/i,
    /\bcontract\s*(address)?\s*:?\s*0x[a-f0-9]+/i,
    /\b[1-9A-HJ-NP-Za-km-z]{32,44}\b/,  // Solana address pattern
  ],
  comparison: [
    /\bvs\.?\b/i,
    /\bversus\b/i,
    /\bcompare\b/i,
    /\bcomparison\b/i,
    /\bwhich\s+(is\s+)?better\b/i,
    /\bor\b.*\?$/i,
  ],
  news_query: [
    /\bnews\b/i,
    /\bwhat('s|s)\s+happening\b/i,
    /\brecent\s+(developments?|updates?|events?)\b/i,
    /\blatest\b/i,
    /\bbreaking\b/i,
    /\bannouncement\b/i,
  ],
  technical_analysis: [
    /\btechnical\s+analysis\b/i,
    /\bTA\b/,
    /\bchart\b/i,
    /\bsupport\s*(and|&)?\s*resistance\b/i,
    /\bindicators?\b/i,
    /\bRSI\b/i,
    /\bMACD\b/i,
    /\bmoving\s+averages?\b/i,
  ],
  sentiment_query: [
    /\bsentiment\b/i,
    /\bsocial\s+(media|sentiment)\b/i,
    /\btwitter\b/i,
    /\breddit\b/i,
    /\bwhat\s+(are\s+)?people\s+(saying|thinking)\b/i,
    /\bhype\b/i,
    /\bfud\b/i,
  ],
  portfolio_query: [
    /\bportfolio\b/i,
    /\bmy\s+(holdings?|positions?|investments?)\b/i,
    /\ballocations?\b/i,
    /\bdiversif(y|ication)\b/i,
  ],
  learning: [
    /\bwhat\s+is\s+(a\s+)?\b/i,
    /\bexplain\b/i,
    /\bhow\s+does\s+.*work\b/i,
    /\bwhat\s+does\s+.*mean\b/i,
    /\bdefine\b/i,
    /\bteach\s+me\b/i,
    /\blearn\b/i,
  ],
  decision_help: [
    /\bshould\s+I\s+(buy|sell|hold|invest)\b/i,
    /\bgood\s+(time\s+)?(to\s+)?(buy|sell|enter)\b/i,
    /\bworth\s+(buying|investing)\b/i,
    /\bentry\s+point\b/i,
    /\bwhat\s+would\s+you\s+do\b/i,
    /\brecommend\b/i,
  ],
  greeting: [
    /^(hi|hey|hello|yo|gm|good\s*(morning|afternoon|evening)|howdy|sup|what'?s?\s*up)\s*[!?.]*$/i,
  ],
  gratitude: [
    /^(thanks?|thank\s*you|thx|ty|appreciate|cheers)\s*[!?.]*$/i,
  ],
  clarification: [
    /^(what|which|how|why|when|where)\?$/i,
    /\bwhat\s+do\s+you\s+mean\b/i,
    /\bcan\s+you\s+(explain|clarify)\b/i,
    /\bmore\s+(details?|info(rmation)?)\b/i,
  ],
  general_question: [
    /\?$/,
  ],
  unknown: [],
};

// Token detection patterns
const TOKEN_PATTERNS = [
  /\$([A-Z]{2,10})\b/gi,           // $BTC, $ETH
  /\b(BTC|ETH|SOL|BNB|XRP|ADA|DOGE|SHIB|MATIC|DOT|AVAX|LINK|UNI|ATOM|LTC)\b/gi,
  /\b([A-Z]{2,6})(\/USD[T]?|\/BTC|\/ETH)\b/gi,  // Trading pairs
];

// Timeframe detection patterns
const TIMEFRAME_PATTERNS: Record<string, RegExp> = {
  'today': /\btoday\b/i,
  'this_week': /\bthis\s+week\b/i,
  'this_month': /\bthis\s+month\b/i,
  '24h': /\b24\s*h(ours?)?\b/i,
  '7d': /\b7\s*d(ays?)?\b/i,
  '30d': /\b30\s*d(ays?)?\b/i,
  'recent': /\b(recent|lately|just)\b/i,
};

// =============================================================================
// CLASSIFICATION FUNCTION
// =============================================================================

/**
 * Classify user message intent
 */
export function classifyIntent(message: string): IntentClassification {
  const lowerMessage = message.toLowerCase().trim();
  
  // Extract entities
  const tokens = extractTokens(message);
  const timeframe = detectTimeframe(message);
  const isComparison = INTENT_PATTERNS.comparison.some(p => p.test(message));
  
  // Try to match each intent
  let bestIntent: IntentType = 'unknown';
  let bestConfidence = 0;
  
  for (const [intent, patterns] of Object.entries(INTENT_PATTERNS) as [IntentType, RegExp[]][]) {
    if (intent === 'unknown') continue;
    
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        const confidence = calculateConfidence(intent, message, tokens);
        if (confidence > bestConfidence) {
          bestIntent = intent;
          bestConfidence = confidence;
        }
        break;
      }
    }
  }
  
  // If we detected tokens but no specific intent, assume token_analysis
  if (bestIntent === 'unknown' && tokens.length > 0) {
    bestIntent = 'token_analysis';
    bestConfidence = 0.6;
  }
  
  // If still unknown but ends with ?, it's a general question
  if (bestIntent === 'unknown' && message.trim().endsWith('?')) {
    bestIntent = 'general_question';
    bestConfidence = 0.5;
  }
  
  const classification: IntentClassification = {
    intent: bestIntent,
    confidence: bestConfidence,
    entities: {
      tokens: tokens.length > 0 ? tokens : undefined,
      timeframe: timeframe || undefined,
      comparison: isComparison || undefined,
    },
    suggestedDepth: getSuggestedDepth(bestIntent, message),
    requiresLiveData: requiresLiveData(bestIntent),
    dataSources: getDataSources(bestIntent, tokens),
  };
  
  logger.debug('Intent classified', { 
    message: message.substring(0, 50), 
    classification 
  });
  
  return classification;
}

/**
 * Extract token symbols from message
 */
function extractTokens(message: string): string[] {
  const tokens: Set<string> = new Set();
  
  for (const pattern of TOKEN_PATTERNS) {
    const matches = message.matchAll(pattern);
    for (const match of matches) {
      const token = (match[1] || match[0]).toUpperCase();
      if (token.length >= 2 && token.length <= 10) {
        tokens.add(token);
      }
    }
  }
  
  return Array.from(tokens);
}

/**
 * Detect timeframe in message
 */
function detectTimeframe(message: string): string | null {
  for (const [timeframe, pattern] of Object.entries(TIMEFRAME_PATTERNS)) {
    if (pattern.test(message)) {
      return timeframe;
    }
  }
  return null;
}

/**
 * Calculate confidence score for intent
 */
function calculateConfidence(intent: IntentType, message: string, tokens: string[]): number {
  let confidence = 0.7; // Base confidence for pattern match
  
  // Boost confidence for specific signals
  if (tokens.length > 0 && ['token_analysis', 'price_check', 'new_coin_analysis'].includes(intent)) {
    confidence += 0.15;
  }
  
  if (message.includes('?')) {
    confidence += 0.05;
  }
  
  // Cap at 0.95
  return Math.min(confidence, 0.95);
}

/**
 * Get suggested response depth based on intent
 */
function getSuggestedDepth(intent: IntentType, message: string): 'minimal' | 'quick' | 'standard' | 'deep' {
  const lowerMessage = message.toLowerCase();
  
  // Check for explicit depth requests
  if (lowerMessage.includes('detailed') || lowerMessage.includes('deep dive') || lowerMessage.includes('full analysis')) {
    return 'deep';
  }
  
  switch (intent) {
    case 'greeting':
    case 'gratitude':
      return 'minimal';
    case 'price_check':
    case 'clarification':
      return 'quick';
    case 'token_analysis':
    case 'new_coin_analysis':
    case 'decision_help':
    case 'comparison':
      return 'standard';
    case 'learning':
    case 'technical_analysis':
      return 'standard';
    default:
      return 'quick';
  }
}

/**
 * Determine if intent requires live data
 */
function requiresLiveData(intent: IntentType): boolean {
  const liveDataIntents: IntentType[] = [
    'price_check',
    'market_overview',
    'token_analysis',
    'new_coin_analysis',
    'comparison',
    'news_query',
    'technical_analysis',
    'sentiment_query',
    'decision_help',
  ];
  return liveDataIntents.includes(intent);
}

/**
 * Get data sources to query based on intent
 */
function getDataSources(intent: IntentType, tokens: string[]): string[] {
  const sources: string[] = [];
  
  switch (intent) {
    case 'price_check':
      sources.push('coingecko', 'dexscreener');
      break;
    case 'market_overview':
      sources.push('coingecko', 'coinglass', 'fear_greed');
      break;
    case 'token_analysis':
    case 'new_coin_analysis':
      sources.push('dexscreener', 'coingecko', 'security', 'holders');
      break;
    case 'news_query':
      sources.push('cryptopanic', 'news');
      break;
    case 'sentiment_query':
      sources.push('lunarcrush', 'twitter');
      break;
    case 'technical_analysis':
      sources.push('coingecko', 'chart');
      break;
    case 'decision_help':
      sources.push('dexscreener', 'coingecko', 'sentiment', 'news');
      break;
    case 'comparison':
      sources.push('coingecko', 'dexscreener');
      break;
    default:
      // No data sources needed
      break;
  }
  
  return sources;
}

// =============================================================================
// RESPONSE FORMAT INSTRUCTIONS
// =============================================================================

/**
 * Get format instructions based on intent
 */
export function getResponseFormatInstructions(classification: IntentClassification): string {
  const { intent, suggestedDepth } = classification;
  
  let instructions = '';
  
  switch (intent) {
    case 'greeting':
      instructions = 'Respond with a brief, natural greeting. No analysis needed.';
      break;
    case 'gratitude':
      instructions = 'Acknowledge briefly. No need to elaborate.';
      break;
    case 'price_check':
      instructions = 'Provide the current price with 24h change. Keep it concise.';
      break;
    case 'market_overview':
      instructions = 'Summarize market conditions: BTC/ETH status, overall sentiment, notable moves.';
      break;
    case 'token_analysis':
    case 'new_coin_analysis':
      instructions = 'Provide structured analysis: price action, liquidity, holder distribution, risks, catalysts.';
      break;
    case 'comparison':
      instructions = 'Compare the tokens across key metrics. Present as a clear comparison, not a recommendation.';
      break;
    case 'decision_help':
      instructions = 'Present facts and considerations. DO NOT recommend buying or selling. Highlight risks.';
      break;
    case 'learning':
      instructions = 'Explain clearly and concisely. Use examples if helpful.';
      break;
    default:
      instructions = 'Respond naturally and concisely.';
  }
  
  // Add depth instruction
  switch (suggestedDepth) {
    case 'minimal':
      instructions += ' Keep response to 1-2 sentences.';
      break;
    case 'quick':
      instructions += ' Keep response brief (2-4 sentences).';
      break;
    case 'standard':
      instructions += ' Provide a complete but focused response (1-2 paragraphs).';
      break;
    case 'deep':
      instructions += ' Provide comprehensive analysis with multiple sections.';
      break;
  }
  
  return instructions;
}
