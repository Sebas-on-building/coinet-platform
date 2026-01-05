/**
 * ⚡ Quick Answer Handler
 * 
 * Handles simple, direct queries like price checks.
 * Optimized for speed - fetches minimal data.
 * 
 * Response Shape: One-liner + 2 bullets
 * Data Depth: Minimal
 * 
 * Examples:
 * - "What's the price of BTC?"
 * - "How much is ETH?"
 * - "BTC price?"
 */

import { IntentClassification } from '../intent-classifier';
import { HandlerResult, createMinimalDataSources, DataSourceConfig } from './index';

export interface QuickAnswerContext {
  requestedMetrics: string[];  // What specific data was asked for
  isSingleCoin: boolean;
}

/**
 * Quick Answer Handler
 * 
 * Fetches only essential market data for fast responses.
 * Skips comprehensive analysis to reduce latency.
 */
export async function quickAnswerHandler(
  message: string,
  classification: IntentClassification,
  detectedCoins: string[]
): Promise<HandlerResult> {
  const lowerMessage = message.toLowerCase();
  
  // Determine what specific metric was requested
  const requestedMetrics: string[] = [];
  if (lowerMessage.includes('price') || lowerMessage.includes('worth') || lowerMessage.includes('trading')) {
    requestedMetrics.push('price');
  }
  if (lowerMessage.includes('volume')) {
    requestedMetrics.push('volume');
  }
  if (lowerMessage.includes('market cap') || lowerMessage.includes('mcap')) {
    requestedMetrics.push('marketCap');
  }
  if (lowerMessage.includes('24h') || lowerMessage.includes('change')) {
    requestedMetrics.push('change24h');
  }
  if (lowerMessage.includes('fear') && lowerMessage.includes('greed')) {
    requestedMetrics.push('fearGreed');
  }
  
  // Default to price if no specific metric detected
  if (requestedMetrics.length === 0) {
    requestedMetrics.push('price');
  }
  
  // Start with minimal data sources
  const dataSources: DataSourceConfig = createMinimalDataSources();
  
  // Enable only what's needed
  dataSources.fetchMarketData = true;
  dataSources.fetchEnterpriseData = detectedCoins.length > 0;
  
  // Fear & Greed requires sentiment
  if (requestedMetrics.includes('fearGreed')) {
    dataSources.fetchSentiment = true;
  }
  
  // Build concise format hint
  const formatHint = `RESPONSE FORMAT: Quick Answer Mode
- Answer in 1-2 sentences with the exact data requested
- Include ONE additional signal if relevant (e.g., 24h change with price)
- Do NOT provide analysis or recommendations unless asked
- Keep it crisp: this user wants fast information, not a lecture

USER WANTS: ${requestedMetrics.join(', ')}`;

  return {
    dataSources,
    aiFormatHint: formatHint,
    contextPriority: ['marketData', 'sentiment'],
    maxContextTokens: 1000,  // Minimal context
    responseGuidance: `Quick answer for ${detectedCoins.length > 0 ? detectedCoins.join(', ') : 'market'}: ${requestedMetrics.join(', ')}`,
  };
}
