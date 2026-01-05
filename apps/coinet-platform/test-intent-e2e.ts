#!/usr/bin/env npx ts-node
/**
 * 🧪 End-to-End Intent System Test
 * 
 * Tests the complete flow: classification → handler → data config
 */

import { classifyIntent } from './src/services/intent-classifier';
import { executeHandler } from './src/services/intent-handlers';

async function testE2E() {
  console.log('🧪 End-to-End Intent System Test\n');
  console.log('='.repeat(70));
  
  const testQueries = [
    { query: 'BTC price', expectedIntent: 'quick_answer' },
    { query: 'Should I buy Ethereum now?', expectedIntent: 'decision_help' },
    { query: 'Analyze Solana with OmniScore', expectedIntent: 'deep_analysis' },
    { query: 'Why isn\'t the data loading?', expectedIntent: 'troubleshoot' },
    { query: 'What is DeFi?', expectedIntent: 'learning' },
  ];

  for (const test of testQueries) {
    console.log(`\n📝 Query: "${test.query}"`);
    console.log('-'.repeat(70));
    
    // Step 1: Classify intent
    const classification = await classifyIntent(test.query);
    const intentMatch = classification.intent === test.expectedIntent ? '✅' : '❌';
    
    console.log(`${intentMatch} Intent: ${classification.intent} (expected: ${test.expectedIntent})`);
    console.log(`   Confidence: ${(classification.confidence * 100).toFixed(1)}%`);
    console.log(`   Depth: ${classification.suggestedDepth}`);
    console.log(`   Shape: ${classification.responseShape}`);
    console.log(`   Processing: ${classification.metadata.processingTimeMs.toFixed(2)}ms`);
    
    // Step 2: Execute handler
    const detectedCoins = test.query.match(/\b(BTC|ETH|SOL|Bitcoin|Ethereum|Solana)\b/gi) || [];
    const handlerResult = await executeHandler(test.query, classification, detectedCoins);
    
    // Step 3: Analyze data config
    const enabledSources = Object.entries(handlerResult.dataSources)
      .filter(([_, enabled]) => enabled)
      .map(([source]) => source);
    
    console.log(`   Data sources enabled: ${enabledSources.length}/${Object.keys(handlerResult.dataSources).length}`);
    console.log(`   Sources: ${enabledSources.join(', ')}`);
    console.log(`   Max tokens: ${handlerResult.maxContextTokens}`);
    console.log(`   Format hint length: ${handlerResult.aiFormatHint.length} chars`);
    
    // Validate based on intent
    if (classification.intent === 'quick_answer') {
      const hasMinimalData = enabledSources.length <= 4;
      console.log(`   ${hasMinimalData ? '✅' : '❌'} Minimal data fetch (expected ≤4 sources)`);
    } else if (classification.intent === 'deep_analysis') {
      const hasFullData = enabledSources.length >= 8;
      console.log(`   ${hasFullData ? '✅' : '❌'} Full data fetch (expected ≥8 sources)`);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ End-to-end test complete!');
}

testE2E().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
