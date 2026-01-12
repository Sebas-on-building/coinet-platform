/**
 * 🔧 Troubleshoot Handler
 * 
 * Handles error reports and technical issues.
 * Provides empathetic responses with diagnostic info and fallbacks.
 * 
 * Response Shape: Diagnostic (acknowledge, diagnose, fallback)
 * Data Depth: Targeted
 * 
 * Examples:
 * - "Why isn't OmniScore working?"
 * - "The price data seems wrong"
 * - "I'm getting an error"
 */

import { IntentClassification } from '../intent-classifier';
import { HandlerResult, createMinimalDataSources, DataSourceConfig } from './index';

export interface TroubleshootContext {
  issueType: 'data' | 'feature' | 'general';
  mentionedFeature?: string;
  hasSpecificError: boolean;
}

/**
 * Troubleshoot Handler
 * 
 * Focuses on understanding the problem and providing actionable solutions.
 * Fetches targeted data to verify the issue.
 */
export async function troubleshootHandler(
  message: string,
  classification: IntentClassification,
  detectedCoins: string[]
): Promise<HandlerResult> {
  const lowerMessage = message.toLowerCase();
  
  // Identify what feature/area the issue relates to
  let issueType: 'data' | 'feature' | 'general' = 'general';
  let mentionedFeature: string | undefined;
  
  if (lowerMessage.includes('price') || lowerMessage.includes('data') || lowerMessage.includes('number')) {
    issueType = 'data';
    mentionedFeature = 'market data';
  }
  if (lowerMessage.includes('omniscore') || lowerMessage.includes('score')) {
    issueType = 'feature';
    mentionedFeature = 'OmniScore';
  }
  if (lowerMessage.includes('chart') || lowerMessage.includes('quadrant')) {
    issueType = 'feature';
    mentionedFeature = 'charts/visualization';
  }
  if (lowerMessage.includes('sentiment') || lowerMessage.includes('fear')) {
    issueType = 'data';
    mentionedFeature = 'sentiment data';
  }
  
  // Check for specific error mentions
  const hasSpecificError = lowerMessage.includes('error') || 
    lowerMessage.includes('failed') ||
    lowerMessage.includes('crashed');
  
  // Minimal data sources - just enough to diagnose
  const dataSources: DataSourceConfig = createMinimalDataSources();
  
  // Fetch relevant data to check if system is working
  dataSources.fetchMarketData = issueType === 'data' || detectedCoins.length > 0;
  dataSources.fetchSentiment = mentionedFeature?.includes('sentiment') || false;
  dataSources.fetchOmniScore = mentionedFeature?.includes('OmniScore') && detectedCoins.length > 0;
  
  // Build conversational diagnostic format
  const formatHint = `INTENT-AWARE RESPONSE GUIDANCE: Helpful Friend Debugging

Something's not working for the user. They might be frustrated. Be empathetic and solution-focused.

CRITICAL RULES:
1. NEVER expose technical jargon, error codes, or system internals
2. NEVER make them feel stupid for asking
3. ALWAYS give them something actionable — even if it's just "let me check"

HOW TO RESPOND:
- First, acknowledge what they're seeing ("Yeah, I see what you're running into...")
- Explain what's happening in plain language — like you'd explain to a friend
- Give them a workaround or solution
- If you can't fix it, be honest and offer an alternative

THEIR SITUATION:
- Issue area: ${issueType}
- Feature mentioned: ${mentionedFeature || 'not specified'}
- Seems urgent: ${hasSpecificError ? 'yes, they mentioned an error' : 'moderate frustration'}

EXAMPLE TONE: "Yeah, I see what you're running into there. Looks like the derivatives data is lagging a bit right now — happens sometimes during high-volume periods. The core price and OmniScore should still be accurate though. Want me to run the analysis without the derivatives component for now?"

If they're reporting incorrect data:
- Check against what you have in context
- If YOUR data looks right, gently explain what they might be comparing against (different exchange, different timeframe, etc.)
- If data really is unavailable, say so honestly and offer what you CAN provide`;

  return {
    dataSources,
    aiFormatHint: formatHint,
    contextPriority: ['marketData', 'omniScore'],
    maxContextTokens: 1500,
    responseGuidance: `Troubleshooting ${mentionedFeature || 'general'} issue${detectedCoins.length > 0 ? ` for ${detectedCoins.join(', ')}` : ''}`,
  };
}
