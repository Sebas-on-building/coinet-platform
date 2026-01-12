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
  
  // Build conversational format hint
  const formatHint = `INTENT-AWARE RESPONSE GUIDANCE: Friend Giving Advice

The user is trying to make a decision. They want your honest take, not a data dump.

HOW TO RESPOND:
- Lead with your actual opinion as a friend would ("Honestly? I'd wait here..." or "Yeah, this looks like a decent entry...")
- Give them 2-3 reasons WHY in conversational prose — not a bullet-pointed checklist
- End by asking about THEIR situation ("What's your timeframe?" or "How much are you comfortable risking?")
- Show you care about helping them make a good decision for THEIR circumstances

THEIR CONTEXT:
- Decision type: ${decisionType.toUpperCase()}
- Time horizon: ${timeHorizon || 'not specified (ask them!)'}
- Risk concern: ${riskFocus ? 'HIGH - they mentioned risk, address it directly' : 'normal'}

EXAMPLE TONE: "Honestly? I'd probably hold off on adding more here. Funding rates are looking stretched and RSI's pushing overbought territory. If you're set on entering, maybe wait for a pullback to the $82K range. What's your risk tolerance like — are you okay with potential 10-15% drawdowns?"

Remember: Use OmniScore quadrant position to inform your recommendation, but explain it conversationally.`;

  return {
    dataSources,
    aiFormatHint: formatHint,
    contextPriority: ['omniScore', 'marketData', 'derivatives', 'sentiment'],
    maxContextTokens: 2500,
    responseGuidance: `Decision help for ${decisionType} ${detectedCoins.join(', ') || 'general market'}`,
  };
}
