#!/usr/bin/env node
/**
 * Simple JavaScript test for intent classifier (no TS compilation needed)
 */

const { performance } = require('perf_hooks');

// Simulate the classifier logic
function classifyIntent(message) {
  const lowerMessage = message.toLowerCase();
  const startTime = performance.now();
  
  // Quick answer patterns
  const quickAnswerPatterns = [
    /\b(?:what(?:'s| is)(?: the)? price|how much is|current price)\b/i,
    /\bprice of\b/i,
    /^(?:btc|eth|sol|bitcoin|ethereum|solana|ada|avax|matic|dot|link)\s*(?:price)?\?*$/i,
    /\bfear (?:and|&) greed\b/i,
  ];
  
  // Decision help patterns
  const decisionHelpPatterns = [
    /\bshould i (?:buy|sell|hold|long|short)\b/i,
    /\bis it (?:a good|the right) time to\b/i,
    /\brisk(?:y| of| level)\b/i,
  ];
  
  // Deep analysis patterns (with exclusions check)
  const deepAnalysisPatterns = [
    /\b(?:analyze|analyse|analysis)\b/i,
    /\bcompare\b/i,
    /\bomniscore\b/i,
    /\bbreakdown\b/i,
  ];
  const deepAnalysisExclusions = [
    /^what (?:is|are)\b/i,
    /\bexplain\b/i,
  ];
  
  // Troubleshoot patterns
  const troubleshootPatterns = [
    /\bwhy (?:isn't|isnt|won't|wont|can't|cant)\b/i,
    /\b(?:not working|broken|error|bug)\b/i,
    /\bwrong (?:data|price|score)\b/i,
  ];
  
  // Learning patterns
  const learningPatterns = [
    /^what (?:is|are) (?:a |an )?(?!the price|the volume|the market|it trading)/i,
    /\bhow (?:does|do)\b/i,
    /\bexplain\b/i,
    /\beli5\b/i,
  ];
  
  // Score each intent
  let scores = {
    quick_answer: 0,
    decision_help: 0,
    deep_analysis: 0,
    troubleshoot: 0,
    learning: 0,
  };
  
  // Apply patterns with exclusion checks
  const hasAnalyzeKeyword = /\banalyze\b/i.test(message) || /\bcompare\b/i.test(message);
  const hasDeepAnalysisExclusion = deepAnalysisExclusions.some(p => p.test(message));
  
  quickAnswerPatterns.forEach(p => { if (p.test(message)) scores.quick_answer += 1.0; });
  decisionHelpPatterns.forEach(p => { if (p.test(message)) scores.decision_help += 1.2; });
  
  // Deep analysis only if no exclusions
  if (!hasDeepAnalysisExclusion) {
    deepAnalysisPatterns.forEach(p => { if (p.test(message)) scores.deep_analysis += 1.3; });
  }
  
  troubleshootPatterns.forEach(p => { if (p.test(message)) scores.troubleshoot += 1.4; });
  learningPatterns.forEach(p => { if (p.test(message) && !hasAnalyzeKeyword) scores.learning += 1.4; });
  
  // Boost for short queries (likely quick answers)
  if (message.length < 30 && scores.quick_answer > 0) {
    scores.quick_answer *= 1.2;
  }
  
  // Find highest score
  let maxScore = 0;
  let intent = 'deep_analysis'; // default fallback
  for (const [key, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      intent = key;
    }
  }
  
  const confidence = maxScore > 0 ? Math.min(0.95, 0.5 + (maxScore / 5)) : 0.3;
  const processingTime = performance.now() - startTime;
  
  return { intent, confidence, score: maxScore, processingTime };
}

// Test cases
const tests = [
  { query: 'BTC price', expected: 'quick_answer' },
  { query: 'What\'s the price of Bitcoin?', expected: 'quick_answer' },
  { query: 'Should I buy ETH?', expected: 'decision_help' },
  { query: 'Analyze Solana', expected: 'deep_analysis' },
  { query: 'Compare BTC and ETH', expected: 'deep_analysis' },
  { query: 'Why isn\'t it working?', expected: 'troubleshoot' },
  { query: 'What is OmniScore?', expected: 'learning' },
  { query: 'Explain DeFi', expected: 'learning' },
];

console.log('🎯 Intent Classifier Quick Test\n');
console.log('='.repeat(70));

let passed = 0;
let totalTime = 0;

tests.forEach(test => {
  const result = classifyIntent(test.query);
  const match = result.intent === test.expected ? '✅' : '❌';
  passed += (result.intent === test.expected ? 1 : 0);
  totalTime += result.processingTime;
  
  console.log(`${match} "${test.query}"`);
  console.log(`   → ${result.intent} (${(result.confidence * 100).toFixed(0)}% conf, ${result.processingTime.toFixed(2)}ms)`);
});

console.log('='.repeat(70));
console.log(`\n📊 Results: ${passed}/${tests.length} passed (${((passed/tests.length)*100).toFixed(0)}%)`);
console.log(`⏱️  Avg time: ${(totalTime/tests.length).toFixed(2)}ms`);

if (passed / tests.length >= 0.8) {
  console.log('\n✅ PASS: Accuracy target met!');
} else {
  console.log('\n❌ FAIL: Below 80% accuracy');
  process.exit(1);
}
