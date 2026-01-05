#!/usr/bin/env npx ts-node
/**
 * 🎯 Intent Classifier Validation Script
 * 
 * Quick validation that the intent classifier is working correctly.
 * Run with: npx ts-node test-intent-classifier.ts
 */

import { classifyIntent, IntentType } from '../intent-classifier';

interface TestCase {
  query: string;
  expected: IntentType;
}

const testCases: TestCase[] = [
  // Quick answer
  { query: 'BTC price', expected: 'quick_answer' },
  { query: 'How much is ETH?', expected: 'quick_answer' },
  { query: 'What\'s the price of Bitcoin?', expected: 'quick_answer' },
  { query: 'Fear and greed index', expected: 'quick_answer' },
  
  // Decision help
  { query: 'Should I buy BTC now?', expected: 'decision_help' },
  { query: 'Is it a good time to sell ETH?', expected: 'decision_help' },
  { query: 'What\'s the risk of holding SOL?', expected: 'decision_help' },
  
  // Deep analysis
  { query: 'Analyze Bitcoin', expected: 'deep_analysis' },
  { query: 'Compare ETH and SOL', expected: 'deep_analysis' },
  { query: 'OmniScore for BTC', expected: 'deep_analysis' },
  { query: 'Full breakdown of Solana', expected: 'deep_analysis' },
  
  // Troubleshoot
  { query: 'Why isn\'t OmniScore working?', expected: 'troubleshoot' },
  { query: 'The price seems wrong', expected: 'troubleshoot' },
  { query: 'Error loading data', expected: 'troubleshoot' },
  
  // Learning
  { query: 'What is OmniScore?', expected: 'learning' },
  { query: 'Explain DeFi', expected: 'learning' },
  { query: 'ELI5 market cap', expected: 'learning' },
  { query: 'How does staking work?', expected: 'learning' },
];

async function runTests() {
  console.log('🎯 Intent Classifier Validation\n');
  console.log('=' .repeat(60));
  
  let passed = 0;
  let failed = 0;
  const failures: Array<{ query: string; expected: IntentType; got: IntentType }> = [];
  
  for (const testCase of testCases) {
    const result = await classifyIntent(testCase.query);
    const pass = result.intent === testCase.expected;
    
    if (pass) {
      passed++;
      console.log(`✅ "${testCase.query.substring(0, 35)}..." → ${result.intent}`);
    } else {
      failed++;
      console.log(`❌ "${testCase.query.substring(0, 35)}..." → ${result.intent} (expected: ${testCase.expected})`);
      failures.push({ query: testCase.query, expected: testCase.expected, got: result.intent });
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log(`\n📊 Results: ${passed}/${testCases.length} passed (${((passed/testCases.length)*100).toFixed(1)}%)`);
  
  if (failures.length > 0) {
    console.log('\n❌ Failures:');
    for (const f of failures) {
      console.log(`   - "${f.query}" → got "${f.got}", expected "${f.expected}"`);
    }
  }
  
  const accuracy = passed / testCases.length;
  if (accuracy >= 0.8) {
    console.log('\n✅ PASS: Accuracy target (80%) met!');
  } else {
    console.log('\n❌ FAIL: Accuracy below 80% target');
  }
  
  // Test performance
  console.log('\n⏱️  Performance Test:');
  const iterations = 100;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) {
    await classifyIntent('What\'s the price of Bitcoin?');
  }
  const avgTime = (performance.now() - start) / iterations;
  console.log(`   Average classification time: ${avgTime.toFixed(2)}ms`);
  console.log(`   ${avgTime < 50 ? '✅' : '❌'} Target: <50ms`);
}

runTests().catch(console.error);
