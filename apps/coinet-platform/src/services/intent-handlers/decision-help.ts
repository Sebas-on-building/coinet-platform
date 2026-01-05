/**
 * 🎯 Decision Help Handler
 * 
 * Handles trading/investment decision queries.
 * Provides balanced risk/reward analysis with clear recommendations.
 * 
 * Response Shape: 3-Block Answer (Answer, Why, Next Step)
 * Data Depth: Medium
 * 
 * Examples:
 * - "Should I buy BTC now?"
 * - "Is it a good time to sell ETH?"
 * - "What's the risk of holding SOL?"
 */

import { IntentClassification } from '../intent-classifier';
import { HandlerResult, createMinimalDataSources, DataSourceConfig } from './index';

export interface DecisionHelpContext {
  decisionType: 'buy' | 'sell' | 'hold' | 'general';
  riskFocus: boolean;
  timeHorizon?: 'short' | 'medium' | 'long';
}

/**
 * Decision Help Handler
 * 
 * Fetches medium-depth data focused on decision-making signals:
 * - Market data for current state
 * - Sentiment for market mood
 * - Derivatives for leverage/positioning
 * - OmniScore for quality/opportunity assessment
 */
export async function decisionHelpHandler(
  message: string,
  classification: IntentClassification,
  detectedCoins: string[]
): Promise<HandlerResult> {
  const lowerMessage = message.toLowerCase();
  
  // Determine decision type
  let decisionType: 'buy' | 'sell' | 'hold' | 'general' = 'general';
  if (lowerMessage.includes('buy') || lowerMessage.includes('long') || lowerMessage.includes('entry')) {
    decisionType = 'buy';
  } else if (lowerMessage.includes('sell') || lowerMessage.includes('short') || lowerMessage.includes('exit')) {
    decisionType = 'sell';
  } else if (lowerMessage.includes('hold') || lowerMessage.includes('keep') || lowerMessage.includes('stay')) {
    decisionType = 'hold';
  }
  
  // Check for risk focus
  const riskFocus = lowerMessage.includes('risk') || lowerMessage.includes('safe') || lowerMessage.includes('danger');
  
  // Determine time horizon
  let timeHorizon: 'short' | 'medium' | 'long' | undefined;
  if (lowerMessage.includes('short term') || lowerMessage.includes('day') || lowerMessage.includes('quick')) {
    timeHorizon = 'short';
  } else if (lowerMessage.includes('long term') || lowerMessage.includes('hodl') || lowerMessage.includes('year')) {
    timeHorizon = 'long';
  } else if (lowerMessage.includes('swing') || lowerMessage.includes('week') || lowerMessage.includes('month')) {
    timeHorizon = 'medium';
  }
  
  // Configure data sources for decision support
  const dataSources: DataSourceConfig = createMinimalDataSources();
  
  // Essential for decisions
  dataSources.fetchMarketData = true;
  dataSources.fetchEnterpriseData = true;
  dataSources.fetchSentiment = true;
  
  // OmniScore provides QS/OS which is perfect for buy/sell decisions
  dataSources.fetchOmniScore = detectedCoins.length > 0;
  
  // Derivatives help with entry/exit timing
  dataSources.fetchDerivatives = decisionType === 'buy' || decisionType === 'sell';
  
  // Risk focus needs more data
  if (riskFocus) {
    dataSources.fetchNews = true;  // For risk events
    dataSources.fetchSocial = true; // For sentiment extremes
  }
  
  // Build 3-Block format hint
  const formatHint = `RESPONSE FORMAT: 3-Block Decision Framework

BLOCK 1 — THE ANSWER (1-3 sentences)
Give your clear recommendation. Be direct: "Yes, consider buying..." or "I'd wait because..."
Don't hedge excessively. Take a stance based on the data.

BLOCK 2 — THE WHY (exactly 3 bullets)
• Signal 1: The strongest supporting data point
• Signal 2: A confirming or contrasting signal  
• Signal 3: The key risk or caveat

BLOCK 3 — NEXT STEP (1 sentence)
One specific action: "Watch for $X level" or "Consider DCA over the next week"

CONTEXT:
- Decision type: ${decisionType.toUpperCase()}
- Time horizon: ${timeHorizon || 'not specified'}
- Risk focus: ${riskFocus ? 'YES - emphasize risks' : 'balanced'}
- Use OmniScore quadrant position to inform recommendation`;

  return {
    dataSources,
    aiFormatHint: formatHint,
    contextPriority: ['omniScore', 'marketData', 'derivatives', 'sentiment'],
    maxContextTokens: 2500,
    responseGuidance: `Decision help for ${decisionType} ${detectedCoins.join(', ') || 'general market'}`,
  };
}
