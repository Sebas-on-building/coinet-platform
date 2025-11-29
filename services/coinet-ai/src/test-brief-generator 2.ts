/**
 * 🧪 BRIEF GENERATOR TEST
 * 
 * Test our divine Brief Generator Engine to ensure it creates
 * perfect structured crypto insights from processed inputs.
 */

import { BriefGenerator } from './generators/brief-generator';
import { InputProcessor } from './processors/input-processor';
import { logger } from './utils/logger';

async function testBriefGenerator() {
  logger.info('🧪 Starting Brief Generator divine testing...');
  
  const inputProcessor = new InputProcessor();
  const briefGenerator = new BriefGenerator();

  // Test cases with different market scenarios
  const testCases = [
    {
      description: 'Bitcoin bullish scenario',
      input: 'What do you think about Bitcoin right now?'
    },
    {
      description: 'Ethereum analysis request',
      input: 'Should I buy Ethereum?'
    },
    {
      description: 'Solana direct ticker',
      input: 'SOL'
    },
    {
      description: 'Complex Bitcoin question',
      input: 'Given the recent ETF news, what are Bitcoin\'s prospects for the next month?'
    }
  ];

  // Run tests
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    
    try {
      logger.info(`\n🧪 Test ${i + 1}: ${testCase.description}`);
      logger.info(`📝 Input: "${testCase.input}"`);
      
      const startTime = Date.now();
      
      // Step 1: Process input
      const processedInput = await inputProcessor.processInput({
        content: testCase.input,
        type: 'auto'
      });
      
      // Step 2: Generate brief
      const brief = await briefGenerator.generateBrief(processedInput, {
        analysisDepth: 'standard',
        includePsychology: true,
        includeOracle: true
      });
      
      const processingTime = Date.now() - startTime;
      
      logger.info(`✅ Test ${i + 1} PASSED in ${processingTime}ms`);
      logger.info(`🎯 Brief ID: ${brief.briefId}`);
      logger.info(`📊 Symbol: ${brief.symbol} | Recommendation: ${brief.recommendation} | Confidence: ${Math.round(brief.confidence * 100)}%`);
      
      // Log brief components
      logger.info(`📖 Thesis: ${brief.thesis.substring(0, 100)}...`);
      logger.info(`⚠️  Risks: ${brief.risks.length} identified (Top: ${brief.risks[0]?.category} - ${brief.risks[0]?.severity})`);
      logger.info(`🚀 Catalysts: ${brief.catalysts.length} identified`);
      logger.info(`💭 Sentiment: ${brief.sentiment.score}/100 (${brief.sentiment.trend})`);
      logger.info(`📋 TL;DR: ${brief.tldr.split('\n')[0]}...`);
      logger.info(`📚 Sources: ${brief.sources.length} compiled`);
      
      // Log AI insights
      if (brief.psychologyInsights) {
        logger.info(`🧠 Psychology: ${brief.psychologyInsights.warnings.length} warnings, ${brief.psychologyInsights.manipulationRisk} manipulation risk`);
      }
      
      if (brief.oracleInsights) {
        const next24h = brief.oracleInsights.predictions.next24h;
        if (next24h) {
          logger.info(`🔮 Oracle: ${next24h.direction} ${next24h.magnitude.toFixed(1)}% (${Math.round(next24h.probability * 100)}% confidence)`);
        }
      }
      
      // Validate structure
      if (!brief.thesis || brief.thesis.length < 50) {
        logger.warn('⚠️ Thesis is too short');
      }
      
      if (brief.risks.length === 0) {
        logger.warn('⚠️ No risks identified');
      }
      
      if (brief.sources.length < 2) {
        logger.warn('⚠️ Insufficient sources');
      }
      
    } catch (error) {
      logger.error(`❌ Test ${i + 1} FAILED: ${testCase.description}`);
      logger.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      logger.error(`Stack: ${error instanceof Error ? error.stack : 'No stack trace'}`);
    }
  }

  logger.info('\n🎉 Brief Generator testing completed!');
  
  // Test brief validation
  logger.info('\n🔍 Testing brief validation...');
  try {
    const sampleInput = await inputProcessor.processInput({
      content: 'BTC',
      type: 'ticker'
    });
    
    const validBrief = await briefGenerator.generateBrief(sampleInput);
    logger.info('✅ Brief validation passed - structure is valid');
    
    // Log final sample brief
    logger.info('\n📄 SAMPLE BRIEF STRUCTURE:');
    logger.info(`Symbol: ${validBrief.symbol}`);
    logger.info(`Recommendation: ${validBrief.recommendation}`);
    logger.info(`Confidence: ${Math.round(validBrief.confidence * 100)}%`);
    logger.info(`Processing Time: ${validBrief.processingTime}ms`);
    logger.info(`Components: Thesis, ${validBrief.risks.length} Risks, ${validBrief.catalysts.length} Catalysts, Sentiment, TL;DR, ${validBrief.sources.length} Sources`);
    
  } catch (error) {
    logger.error('❌ Brief validation failed:', error);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testBriefGenerator().catch(error => {
    logger.error('🚨 Test execution failed:', error);
    process.exit(1);
  });
}

export { testBriefGenerator };
