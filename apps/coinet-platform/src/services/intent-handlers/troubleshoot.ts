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
  
  // Build empathetic diagnostic format
  const formatHint = `RESPONSE FORMAT: Troubleshooting Mode

CRITICAL RULES:
1. NEVER expose technical errors, stack traces, or internal system details
2. NEVER blame the user
3. ALWAYS provide a workaround or next step

STRUCTURE:

LINE 1 — ACKNOWLEDGE (with empathy)
"I see what you mean..." or "Got it, let me check that..."
Show you understand their frustration.

LINE 2-3 — DIAGNOSE
Explain what might be happening in simple terms.
If the feature is working, show evidence.
If it's not working, explain why (in user-friendly language).

LINE 4 — SOLUTION/WORKAROUND
Always provide something actionable:
- "Try asking about [X] instead"
- "The data should refresh in a few minutes"
- "Here's what I can tell you in the meantime..."

CONTEXT:
- Issue type: ${issueType}
- Feature mentioned: ${mentionedFeature || 'none specified'}
- Has specific error: ${hasSpecificError}

If the user is reporting incorrect data:
- Verify against the data you have in context
- If data looks correct, explain what they might be comparing against
- If data is unavailable, acknowledge and offer alternatives`;

  return {
    dataSources,
    aiFormatHint: formatHint,
    contextPriority: ['marketData', 'omniScore'],
    maxContextTokens: 1500,
    responseGuidance: `Troubleshooting ${mentionedFeature || 'general'} issue${detectedCoins.length > 0 ? ` for ${detectedCoins.join(', ')}` : ''}`,
  };
}
