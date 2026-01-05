/**
 * 🎯 Intent Classifier Tests
 * 
 * Tests for the Layer A Intent Classification system.
 * Validates that user queries are correctly routed to appropriate handlers.
 * 
 * Target: 80%+ accuracy across test cases
 */

import { classifyIntent, IntentType, getResponseFormatInstructions } from '../intent-classifier';

describe('Intent Classifier', () => {
  // ============================================================================
  // QUICK_ANSWER INTENT
  // ============================================================================
  
  describe('quick_answer intent', () => {
    const quickAnswerQueries = [
      'What\'s the price of BTC?',
      'How much is ETH?',
      'Current price of Solana',
      'BTC price',
      'price of bitcoin',
      'What is ETH trading at?',
      'How\'s BTC doing?',
      'Quick check on SOL',
      '24h volume for BTC',
      'Market cap of ETH',
      'Fear and greed index',
      'BTC?',
    ];

    test.each(quickAnswerQueries)('should classify "%s" as quick_answer', async (query) => {
      const result = await classifyIntent(query);
      expect(result.intent).toBe('quick_answer');
      expect(result.suggestedDepth).toBe('minimal');
      expect(result.responseShape).toBe('one_liner');
    });

    test('should have high confidence for clear price queries', async () => {
      const result = await classifyIntent('What\'s the price of Bitcoin?');
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  // ============================================================================
  // DECISION_HELP INTENT
  // ============================================================================
  
  describe('decision_help intent', () => {
    const decisionHelpQueries = [
      'Should I buy BTC now?',
      'Is it a good time to sell ETH?',
      'Should I hold SOL or sell?',
      'What\'s the risk of buying AVAX?',
      'Good entry point for BTC?',
      'Is it worth buying ETH at this price?',
      'Should I long or short BTC?',
      'What\'s your take on SOL?',
      'Better to DCA into ETH?',
      'Is SOL bullish or bearish?',
      'Should I get into LINK?',
    ];

    test.each(decisionHelpQueries)('should classify "%s" as decision_help', async (query) => {
      const result = await classifyIntent(query);
      expect(result.intent).toBe('decision_help');
      expect(result.suggestedDepth).toBe('medium');
      expect(result.responseShape).toBe('three_block');
    });

    test('should have high confidence for clear decision queries', async () => {
      const result = await classifyIntent('Should I buy Bitcoin now?');
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  // ============================================================================
  // DEEP_ANALYSIS INTENT
  // ============================================================================
  
  describe('deep_analysis intent', () => {
    const deepAnalysisQueries = [
      'Analyze BTC',
      'Compare ETH and SOL',
      'Give me a full breakdown of Solana',
      'OmniScore for Bitcoin',
      'Deep dive into Ethereum',
      'Comprehensive analysis of AVAX',
      'Tell me everything about Polkadot',
      'BTC vs ETH comparison',
      'What\'s the OmniScore breakdown?',
      'Quality score and opportunity score for SOL',
      'Analyze the fundamentals of Cardano',
      'Compare BTC ETH SOL with omniscore',
    ];

    test.each(deepAnalysisQueries)('should classify "%s" as deep_analysis', async (query) => {
      const result = await classifyIntent(query);
      expect(result.intent).toBe('deep_analysis');
      expect(result.suggestedDepth).toBe('full');
      expect(result.responseShape).toBe('dashboard');
    });

    test('should have high confidence for explicit analysis requests', async () => {
      const result = await classifyIntent('Analyze Bitcoin with OmniScore');
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  // ============================================================================
  // TROUBLESHOOT INTENT
  // ============================================================================
  
  describe('troubleshoot intent', () => {
    const troubleshootQueries = [
      'Why isn\'t OmniScore working?',
      'The price data seems wrong',
      'I\'m getting an error',
      'Why can\'t I see the chart?',
      'Data is not loading',
      'Something\'s wrong with the score',
      'The numbers look incorrect',
      'Help! The analysis failed',
      'Why doesn\'t this work?',
      'OmniScore is broken',
    ];

    test.each(troubleshootQueries)('should classify "%s" as troubleshoot', async (query) => {
      const result = await classifyIntent(query);
      expect(result.intent).toBe('troubleshoot');
      expect(result.suggestedDepth).toBe('minimal');
      expect(result.responseShape).toBe('diagnostic');
    });

    test('should have high confidence for error reports', async () => {
      const result = await classifyIntent('Why isn\'t the OmniScore working?');
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  // ============================================================================
  // LEARNING INTENT
  // ============================================================================
  
  describe('learning intent', () => {
    const learningQueries = [
      'What is OmniScore?',
      'How does DeFi work?',
      'Explain market cap',
      'ELI5 blockchain',
      'What does liquidation mean?',
      'How is the quality score calculated?',
      'Teach me about funding rates',
      'I\'m new to crypto, what is staking?',
      'What\'s the difference between QS and OS?',
      'Can you explain tokenomics?',
      'In simple terms, what is a DEX?',
    ];

    test.each(learningQueries)('should classify "%s" as learning', async (query) => {
      const result = await classifyIntent(query);
      expect(result.intent).toBe('learning');
      expect(result.suggestedDepth).toBe('minimal');
      expect(result.responseShape).toBe('story');
    });

    test('should have high confidence for educational queries', async () => {
      const result = await classifyIntent('What is OmniScore and how does it work?');
      expect(result.confidence).toBeGreaterThan(0.4);
    });
  });

  // ============================================================================
  // EDGE CASES & AMBIGUOUS QUERIES
  // ============================================================================
  
  describe('edge cases', () => {
    test('should handle empty strings gracefully', async () => {
      const result = await classifyIntent('');
      expect(result.intent).toBeDefined();
      expect(result.confidence).toBeLessThan(0.5);
    });

    test('should handle very long queries', async () => {
      const longQuery = 'I\'ve been thinking about my portfolio and I\'m wondering if ' +
        'you could analyze Bitcoin, Ethereum, and Solana for me. I want to understand ' +
        'the quality scores and opportunity scores, and see how they compare in the ' +
        'quadrant visualization. Also, what do you think about the market sentiment?';
      
      const result = await classifyIntent(longQuery);
      expect(result.intent).toBe('deep_analysis');
    });

    test('should prioritize decision_help over quick_answer when asking about buying', async () => {
      const result = await classifyIntent('Should I buy BTC at this price?');
      expect(result.intent).toBe('decision_help');
    });

    test('should prioritize troubleshoot when error words are present', async () => {
      const result = await classifyIntent('Why is the price wrong for BTC?');
      expect(result.intent).toBe('troubleshoot');
    });

    test('should return fallback for ambiguous queries', async () => {
      const result = await classifyIntent('hmm');
      expect(result.metadata.fallbackUsed).toBe(true);
      expect(result.confidence).toBeLessThan(0.5);
    });
  });

  // ============================================================================
  // PERFORMANCE
  // ============================================================================
  
  describe('performance', () => {
    test('should classify within 50ms', async () => {
      const start = performance.now();
      await classifyIntent('What\'s the price of Bitcoin?');
      const duration = performance.now() - start;
      
      expect(duration).toBeLessThan(50);
    });

    test('should handle batch classification efficiently', async () => {
      const queries = [
        'BTC price',
        'Should I buy ETH?',
        'Analyze SOL',
        'What is DeFi?',
        'Help, error!',
      ];

      const start = performance.now();
      await Promise.all(queries.map(q => classifyIntent(q)));
      const duration = performance.now() - start;
      
      // Should complete all 5 within 100ms
      expect(duration).toBeLessThan(100);
    });
  });

  // ============================================================================
  // FORMAT INSTRUCTIONS
  // ============================================================================
  
  describe('getResponseFormatInstructions', () => {
    const intents: IntentType[] = ['quick_answer', 'decision_help', 'deep_analysis', 'troubleshoot', 'learning'];

    test.each(intents)('should return format instructions for %s', (intent) => {
      const instructions = getResponseFormatInstructions(intent);
      expect(instructions).toBeDefined();
      expect(instructions.length).toBeGreaterThan(50);
      expect(instructions).toContain('RESPONSE FORMAT');
    });
  });

  // ============================================================================
  // ACCURACY VALIDATION
  // ============================================================================
  
  describe('accuracy validation', () => {
    // This test validates overall accuracy target of 80%+
    test('should achieve 80%+ accuracy across all test cases', async () => {
      const testCases: Array<{ query: string; expected: IntentType }> = [
        // Quick answer (12 cases)
        { query: 'BTC price', expected: 'quick_answer' },
        { query: 'How much is ETH?', expected: 'quick_answer' },
        { query: 'Current price', expected: 'quick_answer' },
        { query: 'Market cap of SOL', expected: 'quick_answer' },
        { query: 'Fear and greed', expected: 'quick_answer' },
        { query: '24h change BTC', expected: 'quick_answer' },
        
        // Decision help (10 cases)
        { query: 'Should I buy BTC?', expected: 'decision_help' },
        { query: 'Good time to sell?', expected: 'decision_help' },
        { query: 'Hold or sell ETH?', expected: 'decision_help' },
        { query: 'Risk of buying SOL', expected: 'decision_help' },
        { query: 'Entry point for AVAX', expected: 'decision_help' },
        
        // Deep analysis (10 cases)
        { query: 'Analyze Bitcoin', expected: 'deep_analysis' },
        { query: 'Compare ETH SOL', expected: 'deep_analysis' },
        { query: 'OmniScore breakdown', expected: 'deep_analysis' },
        { query: 'Full analysis of MATIC', expected: 'deep_analysis' },
        { query: 'Deep dive AVAX', expected: 'deep_analysis' },
        
        // Troubleshoot (6 cases)
        { query: 'Why not working', expected: 'troubleshoot' },
        { query: 'Error loading data', expected: 'troubleshoot' },
        { query: 'Wrong price shown', expected: 'troubleshoot' },
        
        // Learning (8 cases)
        { query: 'What is OmniScore', expected: 'learning' },
        { query: 'Explain DeFi', expected: 'learning' },
        { query: 'How does staking work', expected: 'learning' },
        { query: 'ELI5 market cap', expected: 'learning' },
      ];

      let correct = 0;
      const results: Array<{ query: string; expected: IntentType; got: IntentType; pass: boolean }> = [];

      for (const testCase of testCases) {
        const result = await classifyIntent(testCase.query);
        const pass = result.intent === testCase.expected;
        if (pass) correct++;
        results.push({
          query: testCase.query,
          expected: testCase.expected,
          got: result.intent,
          pass,
        });
      }

      const accuracy = correct / testCases.length;
      
      // Log failures for debugging
      const failures = results.filter(r => !r.pass);
      if (failures.length > 0) {
        console.log('Failed classifications:', failures);
      }

      expect(accuracy).toBeGreaterThanOrEqual(0.8);
    });
  });
});
