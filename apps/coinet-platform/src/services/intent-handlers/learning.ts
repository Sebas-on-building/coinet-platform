/**
 * 📚 Learning Handler
 * 
 * Handles educational queries and concept explanations.
 * Provides clear, analogy-rich explanations for all skill levels.
 * 
 * Response Shape: Story (analogy-based explanation)
 * Data Depth: Minimal (conceptual)
 * 
 * Examples:
 * - "What is OmniScore?"
 * - "How does DeFi work?"
 * - "Explain market cap in simple terms"
 */

import { IntentClassification } from '../intent-classifier';
import { HandlerResult, createMinimalDataSources, DataSourceConfig } from './index';

export interface LearningContext {
  topic: string;
  complexityLevel: 'eli5' | 'beginner' | 'intermediate' | 'advanced';
  isDefinition: boolean;
  isProcess: boolean;
}

/**
 * Learning Handler
 * 
 * Focuses on conceptual explanation with minimal data fetching.
 * Optimized for clear, educational responses.
 */
export async function learningHandler(
  message: string,
  classification: IntentClassification,
  detectedCoins: string[]
): Promise<HandlerResult> {
  const lowerMessage = message.toLowerCase();
  
  // Determine complexity level requested
  let complexityLevel: 'eli5' | 'beginner' | 'intermediate' | 'advanced' = 'beginner';
  
  if (lowerMessage.includes('eli5') || lowerMessage.includes('simple') || lowerMessage.includes('basic')) {
    complexityLevel = 'eli5';
  } else if (lowerMessage.includes('beginner') || lowerMessage.includes('new to') || lowerMessage.includes('newbie')) {
    complexityLevel = 'beginner';
  } else if (lowerMessage.includes('detail') || lowerMessage.includes('in depth') || lowerMessage.includes('advanced')) {
    complexityLevel = 'advanced';
  } else if (lowerMessage.includes('technical') || lowerMessage.includes('how exactly')) {
    complexityLevel = 'intermediate';
  }
  
  // Identify topic
  let topic = 'general crypto';
  if (lowerMessage.includes('omniscore')) topic = 'OmniScore';
  else if (lowerMessage.includes('quality score') || lowerMessage.includes(' qs ')) topic = 'Quality Score';
  else if (lowerMessage.includes('opportunity score') || lowerMessage.includes(' os ')) topic = 'Opportunity Score';
  else if (lowerMessage.includes('quadrant')) topic = 'Quadrant System';
  else if (lowerMessage.includes('market cap')) topic = 'Market Cap';
  else if (lowerMessage.includes('defi')) topic = 'DeFi';
  else if (lowerMessage.includes('nft')) topic = 'NFTs';
  else if (lowerMessage.includes('blockchain')) topic = 'Blockchain';
  else if (lowerMessage.includes('wallet')) topic = 'Wallets';
  else if (lowerMessage.includes('staking')) topic = 'Staking';
  else if (lowerMessage.includes('liquidity')) topic = 'Liquidity';
  else if (lowerMessage.includes('tokenomics')) topic = 'Tokenomics';
  else if (lowerMessage.includes('funding rate')) topic = 'Funding Rates';
  else if (lowerMessage.includes('liquidation')) topic = 'Liquidations';
  
  // Check if this is a definition vs process explanation
  const isDefinition = lowerMessage.includes('what is') || lowerMessage.includes('what are') || lowerMessage.includes('define');
  const isProcess = lowerMessage.includes('how does') || lowerMessage.includes('how do') || lowerMessage.includes('how can');
  
  // Minimal data sources - education is conceptual
  const dataSources: DataSourceConfig = createMinimalDataSources();
  
  // Fetch real examples if asking about specific metrics
  if (topic.includes('Score') || topic === 'OmniScore' || topic === 'Quadrant System') {
    dataSources.fetchOmniScore = detectedCoins.length > 0;
  }
  
  // Fetch market data for real-world examples
  if (detectedCoins.length > 0) {
    dataSources.fetchMarketData = true;
  }
  
  // Build conversational educational format hint
  const formatHint = `INTENT-AWARE RESPONSE GUIDANCE: Patient Friend Explaining

The user wants to understand something. Be a teacher who actually cares about them getting it.

HOW TO RESPOND:
- Start with a relatable analogy or simple explanation
- Build from simple to complex — don't frontload jargon
- Use "you" language — make it about THEIR understanding
- Check for understanding naturally ("Make sense so far?")
- Offer to go deeper ("Want me to get into how that's different from...?")

THEIR LEVEL: ${complexityLevel.toUpperCase()}

${complexityLevel === 'eli5' ? `
SIMPLE MODE — They want it as basic as possible
- Lead with a vivid analogy ("Think of market cap like a price tag for the whole project...")
- Use everyday comparisons — shopping, games, familiar concepts
- Zero jargon. If you use a term, explain it immediately.
- Keep sentences short.
- End warmly: "Does that click? Happy to explain any part differently."

EXAMPLE TONE: "Okay so market cap — easiest way to think about it is like a price tag on the whole crypto project. If you could buy every single coin at today's price, that's what you'd pay. It's calculated by multiplying the price by how many coins exist. Does that make sense?"
` : complexityLevel === 'beginner' ? `
BEGINNER MODE — They're learning, but not brand new
- One clear sentence to explain what it is
- Then an analogy to make it stick
- One real example they can relate to
- Why this matters to them as someone interested in crypto
- Offer to go deeper on related stuff

EXAMPLE TONE: "Market cap is basically the total value of a crypto project. Think of it like a company's total worth on the stock market. If Bitcoin has 21 million coins and each is worth $87,000, the market cap is roughly $1.8 trillion. It matters because it tells you how 'big' a project is — larger cap usually means more stable, smaller cap means more potential upside but more risk. Want me to explain how that differs from fully diluted valuation?"
` : complexityLevel === 'intermediate' ? `
INTERMEDIATE MODE — They know the basics
- Assume they understand fundamentals
- Get into the mechanism and nuances
- Cover practical applications
- Mention gotchas experienced people encounter

EXAMPLE TONE: "So with OmniScore, the system actually separates two things most people conflate — the quality of the project itself (QS) and whether the market is currently rewarding it (OS). You can have excellent fundamentals score low overall because momentum is dead. That's actually useful info — it tells you something's undervalued by attention, not by quality."
` : `
ADVANCED MODE — They want technical depth
- Use proper terminology
- Get into edge cases and limitations
- Historical context if relevant
- Professional-level application

EXAMPLE TONE: "The Opportunity Score specifically weights funding rate divergence, open interest delta, and put-call skew to capture positioning extremes. The interesting edge case is during regime changes — when correlations break down, OS can lag because it's trained on historical momentum patterns."
`}

TOPIC: ${topic}
TYPE: ${isDefinition ? 'Definition (what is it?)' : isProcess ? 'Process (how does it work?)' : 'General explanation'}

${topic === 'OmniScore' || topic.includes('Score') ? `
FOR COINET-SPECIFIC TOPICS:
- Explain OmniScore as Coinet's proprietary scoring system (0-100)
- Mention tiers: Elite (85+), Strong (70-84), Neutral (50-69), Weak (30-49), Critical (0-29)
- Explain quadrants: TARGET (high quality + high opportunity), BUILDER (high quality + low opportunity), HYPE (low quality + high opportunity), AVOID (low quality + low opportunity)
- Use real examples if you have them in context
` : ''}

GOLDEN RULE: Never make them feel stupid for asking. Every question is a good question. Meet them where they are.`;

  return {
    dataSources,
    aiFormatHint: formatHint,
    contextPriority: ['omniScore', 'marketData'],
    maxContextTokens: 1500,
    responseGuidance: `Educational: ${topic} (${complexityLevel} level)`,
  };
}
