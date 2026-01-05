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
  
  // Build comprehensive format hint
  let formatHint = `RESPONSE FORMAT: Comprehensive Analysis

STRUCTURE:`;

  if (isComparison) {
    formatHint += `

COMPARISON MODE (${detectedCoins.length} assets)
1. OVERVIEW: Brief positioning of each asset (1 sentence each)
2. HEAD-TO-HEAD: Compare key metrics side by side
   - OmniScore (POS, tier, quadrant)
   - Quality Score vs Opportunity Score
   - Risk assessment
3. VERDICT: Clear winner or nuanced recommendation
4. QUADRANT CHART: Reference the visual quadrant chart displayed above

Note: A visual OmniScore quadrant chart will be rendered automatically.
Reference it: "Looking at the quadrant chart above..."`;
  } else {
    formatHint += `

SINGLE ASSET DEEP DIVE
1. HEADLINE: POS score and tier in first sentence
2. QUALITY BREAKDOWN: QS components and what they mean
3. OPPORTUNITY ASSESSMENT: OS components and timing signals
4. RISK PROFILE: Key risks with severity
5. POSITIONING: Quadrant and what it implies
6. BOTTOM LINE: 2-3 sentence synthesis

Use exact numbers from OmniScore data. Never estimate or round.`;
  }

  formatHint += `

RULES:
- Lead with OmniScore if available
- Use exact numbers: "scores 74.2/100" not "scores around 74"
- Cite tier correctly based on thresholds (Elite: 85+, Strong: 70-84, etc.)
- Reference data sources when making claims`;

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
