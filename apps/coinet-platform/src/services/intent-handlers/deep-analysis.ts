/**
 * 📊 Deep Analysis Handler
 * 
 * Handles comprehensive analysis requests.
 * Fetches all available data for thorough breakdowns.
 * 
 * Response Shape: Dashboard (full metrics)
 * Data Depth: Full
 * 
 * Examples:
 * - "Analyze BTC"
 * - "Compare ETH and SOL"
 * - "Give me the OmniScore breakdown for..."
 */

import { IntentClassification } from '../intent-classifier';
import { HandlerResult, createFullDataSources, DataSourceConfig } from './index';

export interface DeepAnalysisContext {
  isComparison: boolean;
  requestedMetrics: string[];
  includeOmniScore: boolean;
  includeQuadrant: boolean;
}

/**
 * Deep Analysis Handler
 * 
 * Fetches comprehensive data for thorough analysis:
 * - Full market data with enterprise pipeline
 * - OmniScore with quadrant positioning
 * - Sentiment and social intelligence
 * - Derivatives and risk metrics
 * - News and influencer data
 */
export async function deepAnalysisHandler(
  message: string,
  classification: IntentClassification,
  detectedCoins: string[]
): Promise<HandlerResult> {
  const lowerMessage = message.toLowerCase();
  
  // Detect comparison requests
  const isComparison = detectedCoins.length > 1 || 
    lowerMessage.includes('compare') ||
    lowerMessage.includes(' vs ') ||
    lowerMessage.includes(' or ') ||
    lowerMessage.includes(' and ');
  
  // Detect specific metrics requested
  const requestedMetrics: string[] = [];
  if (lowerMessage.includes('omniscore') || lowerMessage.includes('score')) {
    requestedMetrics.push('omniScore');
  }
  if (lowerMessage.includes('quadrant')) {
    requestedMetrics.push('quadrant');
  }
  if (lowerMessage.includes('fundamental')) {
    requestedMetrics.push('fundamentals');
  }
  if (lowerMessage.includes('technical') || lowerMessage.includes('chart')) {
    requestedMetrics.push('technical');
  }
  if (lowerMessage.includes('sentiment')) {
    requestedMetrics.push('sentiment');
  }
  if (lowerMessage.includes('risk')) {
    requestedMetrics.push('risk');
  }
  if (lowerMessage.includes('tokenomics') || lowerMessage.includes('supply')) {
    requestedMetrics.push('tokenomics');
  }
  
  // Full data sources for comprehensive analysis
  const dataSources: DataSourceConfig = createFullDataSources();
  
  // Disable expensive sources if not needed
  if (!lowerMessage.includes('influencer') && !lowerMessage.includes('whale')) {
    dataSources.fetchInfluencer = false;
    dataSources.fetchWhaleData = false;
  }
  
  // Behavioral/neuroeconomic only for decision-heavy queries
  if (!lowerMessage.includes('psychology') && !lowerMessage.includes('behavior')) {
    dataSources.fetchBehavioral = false;
    dataSources.fetchNeuroeconomic = false;
  }
  
  // Build conversational format hint
  let formatHint = `INTENT-AWARE RESPONSE GUIDANCE: Knowledgeable Friend Going Deep

The user wants the full picture. Give them thorough analysis, but don't sound like a textbook.

HOW TO RESPOND:
- Open with a quick summary of your overall take ("Alright, let me break this down...")
- Walk through the OmniScore metrics conversationally — use exact numbers but explain what they MEAN
- Include risks and opportunities, but weave them in naturally
- End with what YOU think matters most and invite follow-up questions`;

  if (isComparison) {
    formatHint += `

COMPARISON MODE (${detectedCoins.length} assets)
You're comparing multiple assets. Structure it like explaining to a friend:
- Start with the quick verdict ("BTC's in a much stronger position than ETH right now...")
- Walk through each asset's strengths and weaknesses naturally
- Use the OmniScore quadrant to explain WHERE each sits and WHY that matters
- End with your honest take on which makes more sense given current conditions

A visual OmniScore quadrant chart will be rendered automatically above your response.
Reference it naturally: "Looking at where they sit on the quadrant..."

EXAMPLE TONE: "So, comparing these three — BTC's clearly the strongest position at 85/100, that's Elite tier. ETH's interesting though — it's only 43/100 overall (Weak tier, I know), but look at the QS: 74/100. The fundamentals are actually solid, the market just isn't rewarding it right now. SOL's somewhere in between..."`;
  } else {
    formatHint += `

SINGLE ASSET DEEP DIVE
Walk through the analysis like you're explaining over coffee:
- Lead with the overall OmniScore and what tier that puts them in
- Break down Quality Score — what's driving it up or down?
- Break down Opportunity Score — is the market paying attention or not?
- Explain the quadrant position and what that means for their situation
- Be honest about risks
- End with YOUR take and invite questions

EXAMPLE TONE: "Alright, let me break down ETH's OmniScore for you. It's sitting at 43/100 overall — Weak tier, which sounds rough. But here's where it gets interesting: the Quality Score is actually 74/100, that's Strong tier. Solid fundamentals. The problem is the Opportunity Score at just 31/100 — the market isn't paying attention right now. Classic Builder Zone setup. What specifically caught your eye about ETH?"`;
  }

  formatHint += `

CRITICAL RULES:
- Use EXACT numbers from OmniScore: "74.2/100" not "around 74"
- Cite tier correctly (Elite: 85+, Strong: 70-84, Neutral: 50-69, Weak: 30-49, Critical: 0-29)
- Be thorough but CONVERSATIONAL — this isn't a report, it's an explanation`;

  return {
    dataSources,
    aiFormatHint: formatHint,
    contextPriority: ['omniScore', 'marketData', 'derivatives', 'sentiment', 'social', 'news'],
    maxContextTokens: 5000,
    responseGuidance: isComparison 
      ? `Comparison analysis for ${detectedCoins.join(' vs ')}` 
      : `Deep analysis for ${detectedCoins[0] || 'market'}`,
  };
}
