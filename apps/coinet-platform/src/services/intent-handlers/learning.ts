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
  
  // Build educational format hint
  const formatHint = `RESPONSE FORMAT: Educational Explanation

COMPLEXITY LEVEL: ${complexityLevel.toUpperCase()}

STRUCTURE:

${complexityLevel === 'eli5' ? `
ELI5 MODE
1. START with a vivid analogy ("Think of it like...")
2. Keep sentences short and simple
3. No jargon - if you use a term, immediately explain it
4. Use everyday examples (shopping, games, etc.)
5. End with: "Does that help? Happy to explain any part differently."
` : complexityLevel === 'beginner' ? `
BEGINNER MODE
1. Open with a clear, one-sentence definition
2. Use an analogy to make it relatable
3. Give one real-world example
4. Explain WHY it matters to them as an investor/trader
5. Offer to go deeper: "Want me to explain [related concept]?"
` : complexityLevel === 'intermediate' ? `
INTERMEDIATE MODE
1. Concise definition (assume basic knowledge)
2. Explain the mechanism/process
3. Cover common use cases
4. Mention gotchas or nuances
5. Provide practical application
` : `
ADVANCED MODE
1. Technical definition with proper terminology
2. Detailed mechanism explanation
3. Edge cases and limitations
4. Historical context if relevant
5. Professional application tips
`}

TOPIC: ${topic}
TYPE: ${isDefinition ? 'Definition' : isProcess ? 'Process explanation' : 'General explanation'}

${topic === 'OmniScore' || topic.includes('Score') ? `
FOR COINET-SPECIFIC TOPICS:
- Explain the scoring methodology
- Mention the 0-100 scale and tiers (Elite: 85+, Strong: 70-84, Neutral: 50-69, Weak: 30-49, Critical: 0-29)
- Explain what the quadrants mean (Target, Builder, Hype, Avoid)
- Use real examples from context if available
` : ''}

GOLDEN RULE: Never make the user feel stupid for asking. Every question is a good question.`;

  return {
    dataSources,
    aiFormatHint: formatHint,
    contextPriority: ['omniScore', 'marketData'],
    maxContextTokens: 1500,
    responseGuidance: `Educational: ${topic} (${complexityLevel} level)`,
  };
}
