/**
 * 🧪 INPUT PROCESSOR TEST
 * 
 * Quick test to verify our Input Processor is working correctly
 * with various input types and scenarios.
 */

import { InputProcessor } from './processors/input-processor';
import { UserInput } from './types/coinet-brief';
import { logger } from './utils/logger';

async function testInputProcessor() {
  logger.info('🧪 Starting Input Processor divine testing...');
  
  const processor = new InputProcessor();

  // Test cases covering different input types
  const testCases: { description: string; input: UserInput }[] = [
    {
      description: 'Direct ticker symbol',
      input: {
        content: 'BTC',
        type: 'auto'
      }
    },
    {
      description: 'Ticker with dollar sign',
      input: {
        content: '$BITCOIN',
        type: 'auto'
      }
    },
    {
      description: 'Natural language question',
      input: {
        content: 'What do you think about Bitcoin right now?',
        type: 'auto'
      }
    },
    {
      description: 'Ethereum analysis request',
      input: {
        content: 'Should I buy Ethereum?',
        type: 'auto'
      }
    },
    {
      description: 'Solana ticker',
      input: {
        content: 'SOL',
        type: 'ticker'
      }
    },
    {
      description: 'Complex question with context',
      input: {
        content: 'Given the recent ETF news, what are your thoughts on Bitcoin\'s prospects?',
        type: 'auto',
        context: {
          analysisDepth: 'deep',
          timeframe: '1w'
        }
      }
    }
  ];

  // Run tests
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    
    try {
      logger.info(`\n🧪 Test ${i + 1}: ${testCase.description}`);
      logger.info(`📝 Input: "${testCase.input.content}"`);
      
      const startTime = Date.now();
      const result = await processor.processInput(testCase.input);
      const processingTime = Date.now() - startTime;
      
      logger.info(`✅ Test ${i + 1} PASSED in ${processingTime}ms`);
      logger.info(`🎯 Detected: ${result.detectedType} | Symbol: ${result.symbol} | Confidence: ${result.confidence}`);
      logger.info(`📊 Data freshness: ${result.dataFreshness} | Completeness: ${result.completeness}`);
      
      // Log available data sources
      const dataSources = [];
      if (result.marketData) dataSources.push('Market');
      if (result.socialData) dataSources.push('Social');
      if (result.newsData) dataSources.push('News');
      if (result.onChainData) dataSources.push('OnChain');
      
      logger.info(`📡 Data sources: ${dataSources.join(', ')}`);
      
    } catch (error) {
      logger.error(`❌ Test ${i + 1} FAILED: ${testCase.description}`);
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  logger.info('\n🎉 Input Processor testing completed!');
}

// Run the test if this file is executed directly
if (require.main === module) {
  testInputProcessor().catch(error => {
    logger.error('🚨 Test execution failed:', error);
    process.exit(1);
  });
}

export { testInputProcessor };
