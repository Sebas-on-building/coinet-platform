/**
 * 🎭 Mock AI Response Generator
 * 
 * Fallback AI response generator when the AI service is unavailable.
 * Provides realistic mock responses for development and fallback scenarios.
 */

import { AIAnalysisResponse } from '../../services/ai-service';

/**
 * Generate a mock AI response based on user message
 */
export function generateMockResponse(message: string): AIAnalysisResponse {
  const lowerMessage = message.toLowerCase();
  
  // Extract potential symbol mentions
  const symbolMatch = message.match(/\b(BTC|ETH|SOL|BNB|ADA|DOT|MATIC|AVAX|LINK|UNI|ATOM|XRP|DOGE|SHIB|LTC|BCH|ETC|XLM|ALGO|VET|FIL|TRX|EOS|AAVE|MKR|COMP|SNX|YFI|SUSHI|CRV|1INCH|BAL|REN|KNC|ZRX|BAT|MANA|SAND|AXS|ENJ|CHZ|FLOW|THETA|ICP|NEAR|FTM|LUNA|UST|AVAX|DOT|KSM|ATOM|OSMO|JUNO|SCRT|AKASH|REGEN|BAND|ROSE|CELO|HARMONY|ONE|AVAX|FTM|MATIC|ARB|OP|BASE|ZKSYNC|STARKNET|POLYGON|BSC|AVALANCHE|FANTOM|COSMOS|TERRA|NEAR|SOLANA|ETHEREUM|BITCOIN)\b/i);
  const symbol = symbolMatch ? symbolMatch[1].toUpperCase() : 'BTC';
  
  // Detect intent
  const isPriceQuery = /price|cost|worth|value|trading at/i.test(message);
  const isAnalysisQuery = /analyze|analysis|outlook|forecast|prediction|trend/i.test(message);
  const isNewsQuery = /news|update|happening|recent|latest/i.test(message);
  const isTechnicalQuery = /technical|indicator|rsi|macd|support|resistance|chart/i.test(message);
  
  // Generate appropriate response
  let thesis = '';
  let keyTopics: string[] = [];
  let recommendation = '';
  
  if (isPriceQuery) {
    thesis = `Based on current market data, ${symbol} is showing strong fundamentals with increasing adoption and institutional interest. The current price reflects a healthy market sentiment.`;
    keyTopics = ['Price Action', 'Market Sentiment', 'Trading Volume'];
    recommendation = 'Hold';
  } else if (isAnalysisQuery) {
    thesis = `${symbol} demonstrates robust technical indicators with potential for continued growth. The asset shows strong community support and active development. Key factors include market adoption, technical infrastructure, and regulatory clarity.`;
    keyTopics = ['Technical Analysis', 'Fundamentals', 'Market Trends', 'Adoption'];
    recommendation = 'Consider accumulation on dips';
  } else if (isNewsQuery) {
    thesis = `Recent developments around ${symbol} indicate positive momentum. The ecosystem continues to evolve with new partnerships and technological improvements.`;
    keyTopics = ['Recent News', 'Partnerships', 'Development Updates'];
    recommendation = 'Monitor closely';
  } else if (isTechnicalQuery) {
    thesis = `Technical analysis for ${symbol} suggests a mixed signal. Key support and resistance levels are being tested. RSI indicators show neutral momentum.`;
    keyTopics = ['Technical Indicators', 'Support/Resistance', 'RSI', 'MACD'];
    recommendation = 'Wait for clearer signals';
  } else {
    thesis = `I understand you're asking about ${symbol}. This is a complex topic that requires careful analysis of multiple factors including market conditions, technical indicators, and fundamental developments.`;
    keyTopics = ['Market Analysis', 'Risk Assessment', 'Opportunities'];
    recommendation = 'Further analysis recommended';
  }
  
  return {
    success: true,
    data: {
      symbol,
      thesis,
      summary: `Mock response for: ${message.substring(0, 100)}...`,
      confidence: 0.65,
      recommendation,
      keyTopics,
      risks: ['Market volatility', 'Regulatory uncertainty', 'Liquidity risks'],
      catalysts: ['Institutional adoption', 'Technical improvements', 'Market expansion'],
    },
    metadata: {
      requestId: `mock-${Date.now()}`,
      processingTime: 50,
      version: '1.0.0-mock',
    },
  };
}

