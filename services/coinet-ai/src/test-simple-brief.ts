/**
 * 🧪 SIMPLE BRIEF TEST
 * 
 * Minimal test to identify the exact validation issue
 */

import { BriefGenerator } from './generators/brief-generator';
import { InputProcessor } from './processors/input-processor';
import { logger } from './utils/logger';

async function testSimpleBrief() {
  logger.info('🧪 Testing simple brief generation...');
  
  const inputProcessor = new InputProcessor();
  const briefGenerator = new BriefGenerator();

  try {
    // Process input
    const processedInput = await inputProcessor.processInput({
      content: 'SOL',
      type: 'ticker'
    });
    
    logger.info('✅ Input processed successfully');

    // Generate brief WITHOUT validation first
    const startTime = Date.now();
    const briefData = {
      symbol: processedInput.symbol,
      briefId: 'test-123',
      timestamp: new Date(),
      thesis: 'Test thesis',
      risks: [],
      catalysts: [],
      sentiment: {
        score: 50,
        trend: 'stable' as const,
        authenticity: 0.8,
        drivers: ['test']
      },
      tldr: 'Test TL;DR',
      sources: [],
      recommendation: 'hold' as const,
      confidence: 0.8,
      analysisDepth: 'standard' as const,
      processingTime: Date.now() - startTime,
      processedFrom: processedInput.originalInput
    };

    logger.info('📄 Raw brief data:', briefData);

    // Try validation
    const { validateCoinetBrief } = require('./types/coinet-brief');
    const validatedBrief = validateCoinetBrief(briefData);
    
    logger.info('✅ Validation passed!');
    logger.info('📋 Brief structure valid');

  } catch (error) {
    logger.error('❌ Test failed:', error);
    
    if (error instanceof Error && error.name === 'ValidationError' && 'validationErrors' in error) {
      logger.error('🔍 Validation errors:', (error as any).validationErrors.errors);
    }
  }
}

// Run the test
testSimpleBrief().catch(error => {
  logger.error('🚨 Test execution failed:', error);
  process.exit(1);
});
