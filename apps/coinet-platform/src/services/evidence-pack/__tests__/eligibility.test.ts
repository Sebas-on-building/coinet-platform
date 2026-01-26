/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🧪 EVIDENCE PACK — ELIGIBILITY GATE TESTS                                 ║
 * ║                                                                               ║
 * ║   Tests for the deterministic eligibility gate.                               ║
 * ║   Ensures rules are applied correctly and consistently.                       ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Universal Evidence Pack Layer                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import {
  decideEvidenceEligibility,
  isGreetingOrAck,
  isEducationalQuery,
  isMarketQuery,
  isPriceCheckOnly,
} from '../eligibility';
import { DetectedTokenEntity, EligibilityInput } from '../types';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function createInput(
  userMessage: string,
  detectedIntent: string,
  tokenEntities: Partial<DetectedTokenEntity>[] = [],
  conversationState: Partial<EligibilityInput['conversationState']> = {}
): EligibilityInput {
  return {
    userMessage,
    detectedIntent,
    tokenEntities: tokenEntities.map(e => ({
      ref: {
        type: e.ref?.type || 'ticker',
        raw: e.ref?.raw || 'TEST',
        normalized: e.ref?.normalized || 'TEST',
        chain: e.ref?.chain,
        confidence: e.ref?.confidence || 0.5,
      },
      position: e.position || { start: 0, end: 4 },
      matchedPattern: e.matchedPattern || 'test',
    })),
    conversationState: {
      turnCount: conversationState.turnCount || 0,
      lastResolvedToken: conversationState.lastResolvedToken,
      pendingClarification: conversationState.pendingClarification,
    },
  };
}

function createTokenEntity(
  type: 'contract_address' | 'ticker' | 'dexscreener_url' | 'pumpfun_url' | 'pair_address',
  raw: string,
  confidence: number,
  chain?: 'ethereum' | 'solana' | 'bsc' | 'polygon' | 'unknown'
): Partial<DetectedTokenEntity> {
  return {
    ref: {
      type,
      raw,
      normalized: raw.toLowerCase(),
      chain,
      confidence,
    },
  };
}

// ============================================================================
// TESTS: HELPER FUNCTIONS
// ============================================================================

describe('isGreetingOrAck', () => {
  test.each([
    ['hey', true],
    ['hi', true],
    ['hello!', true],
    ['thanks', true],
    ['thank you!', true],
    ['ok', true],
    ['okay', true],
    ['got it', true],
    ['cool', true],
    ['nice', true],
    ['gm', true],
    ['hola', true],
    ['hallo', true],
    ['danke', true],
    ['bye', true],
    // Negative cases
    ['hey what is btc price', false],
    ['hello analyze sol', false],
    ['thanks for the analysis can you check eth', false],
  ])('"%s" should return %s', (message, expected) => {
    expect(isGreetingOrAck(message)).toBe(expected);
  });
});

describe('isEducationalQuery', () => {
  test.each([
    ['what is defi?', 'learning', true],
    ['what are smart contracts?', 'learning', true],
    ['explain how liquidity pools work', 'learning', true],
    ['define market cap', 'learning', true],
    ['what does APY mean', 'learning', true],
    ['teach me about staking', 'learning', true],
    ['eli5 ethereum', 'learning', true],
    // With analysis keywords - should NOT be educational
    ['what is this token, should i buy?', 'learning', false],
    ['what is the risk of this coin', 'learning', false],
    // Different intent
    ['what is btc price', 'quick_answer', false],
    ['analyze btc', 'deep_analysis', false],
  ])('"%s" with intent "%s" should return %s', (message, intent, expected) => {
    expect(isEducationalQuery(message, intent)).toBe(expected);
  });
});

describe('isMarketQuery', () => {
  test.each([
    ['what happened today?', 'deep_analysis', true],
    ['market overview', 'quick_answer', true],
    ['explain the dump', 'decision_help', true],
    ['why did crypto crash', 'quick_answer', true],
    ['how is the market', 'quick_answer', true],
    ['fear and greed index', 'quick_answer', true],
    // Token queries - should NOT be market
    ['analyze $PEPE', 'new_coin_analysis', false],
    ['what is 0x123 doing', 'quick_answer', false],
  ])('"%s" with intent "%s" should return %s', (message, intent, expected) => {
    expect(isMarketQuery(message, intent)).toBe(expected);
  });
});

describe('isPriceCheckOnly', () => {
  test.each([
    ['btc price', true],
    ['price of btc', true],
    ['eth', true],
    ['bitcoin', true],
    ['sol price?', true],
    // Not simple price checks
    ['btc price and analysis', false],
    ['analyze btc', false],
    ['should i buy btc', false],
    ['random coin price', false], // Not a major
  ])('"%s" should return %s', (message, expected) => {
    expect(isPriceCheckOnly(message)).toBe(expected);
  });
});

// ============================================================================
// TESTS: ELIGIBILITY DECISION
// ============================================================================

describe('decideEvidenceEligibility', () => {
  describe('Rule 1: Greetings NOT eligible', () => {
    test.each([
      'hey',
      'hi!',
      'hello',
      'thanks',
      'ok',
      'cool',
      'gm',
    ])('"%s" should NOT be eligible', (message) => {
      const result = decideEvidenceEligibility(createInput(message, 'quick_answer'));
      expect(result.eligible).toBe(false);
      expect(result.kind).toBe('NONE');
      expect(result.reason).toContain('Greeting');
    });
  });

  describe('Rule 2: Educational queries NOT eligible (without tokens)', () => {
    test('pure educational query should NOT be eligible', () => {
      const result = decideEvidenceEligibility(createInput('what is defi?', 'learning'));
      expect(result.eligible).toBe(false);
      expect(result.kind).toBe('NONE');
      expect(result.reason).toContain('Educational');
    });
  });

  describe('Rule 3: Troubleshoot without token NOT eligible', () => {
    test('troubleshoot query without token should NOT be eligible', () => {
      const result = decideEvidenceEligibility(createInput("why isn't the app loading?", 'troubleshoot'));
      expect(result.eligible).toBe(false);
      expect(result.kind).toBe('NONE');
    });
  });

  describe('Rule 4: Direct address → TOKEN, CONFIRMED', () => {
    test('contract address should be eligible with CONFIRMED status', () => {
      const entity = createTokenEntity('contract_address', '0x1234567890abcdef1234567890abcdef12345678', 0.95, 'ethereum');
      const result = decideEvidenceEligibility(createInput('analyze 0x1234...', 'new_coin_analysis', [entity]));
      
      expect(result.eligible).toBe(true);
      expect(result.kind).toBe('TOKEN');
      expect(result.resolutionStatus).toBe('CONFIRMED');
      expect(result.reason).toContain('address');
    });
  });

  describe('Rule 5: High confidence ticker → TOKEN, CONFIRMED', () => {
    test('high confidence ticker should be eligible with CONFIRMED status', () => {
      const entity = createTokenEntity('ticker', '$BONK', 0.90, 'solana');
      const result = decideEvidenceEligibility(createInput('analyze $BONK', 'new_coin_analysis', [entity]));
      
      expect(result.eligible).toBe(true);
      expect(result.kind).toBe('TOKEN');
      expect(result.resolutionStatus).toBe('CONFIRMED');
      expect(result.reason).toContain('High confidence');
    });
  });

  describe('Rule 6: Low confidence ticker → TOKEN, NEEDS_CONFIRMATION', () => {
    test('low confidence ticker should be eligible with NEEDS_CONFIRMATION status', () => {
      const entity = createTokenEntity('ticker', '$PEPE', 0.50);
      const result = decideEvidenceEligibility(createInput('what about $PEPE?', 'decision_help', [entity]));
      
      expect(result.eligible).toBe(true);
      expect(result.kind).toBe('TOKEN');
      expect(result.resolutionStatus).toBe('NEEDS_CONFIRMATION');
      expect(result.reason).toContain('clarification');
    });
  });

  describe('Rule 7: Medium confidence ticker → TOKEN, TENTATIVE', () => {
    test('medium confidence ticker should be eligible with TENTATIVE status', () => {
      const entity = createTokenEntity('ticker', '$DOGE', 0.70);
      const result = decideEvidenceEligibility(createInput('analyze $DOGE', 'deep_analysis', [entity]));
      
      expect(result.eligible).toBe(true);
      expect(result.kind).toBe('TOKEN');
      expect(result.resolutionStatus).toBe('TENTATIVE');
    });
  });

  describe('Rule 8: Simple price check for majors → MARKET, minimal', () => {
    test('btc price check should be eligible for MARKET with minimal budget', () => {
      const result = decideEvidenceEligibility(createInput('btc price', 'quick_answer'));
      
      expect(result.eligible).toBe(true);
      expect(result.kind).toBe('MARKET');
      expect(result.budgetTier).toBe('minimal');
    });
  });

  describe('Rule 9: Market query patterns → MARKET', () => {
    test.each([
      ['what happened today?', 'deep_analysis', 'full'],
      ['market overview', 'quick_answer', 'standard'],
      ['explain the dump', 'decision_help', 'standard'],
    ])('"%s" should be eligible for MARKET with %s budget', (message, intent, expectedBudget) => {
      const result = decideEvidenceEligibility(createInput(message, intent));
      
      expect(result.eligible).toBe(true);
      expect(result.kind).toBe('MARKET');
      expect(result.budgetTier).toBe(expectedBudget);
    });
  });

  describe('Rule 10: Analysis intents without token → MARKET', () => {
    test('decision_help without token should be MARKET', () => {
      const result = decideEvidenceEligibility(createInput('should i buy crypto?', 'decision_help'));
      
      expect(result.eligible).toBe(true);
      expect(result.kind).toBe('MARKET');
    });

    test('deep_analysis without token should be MARKET with full budget', () => {
      const result = decideEvidenceEligibility(createInput('give me a full market analysis', 'deep_analysis'));
      
      expect(result.eligible).toBe(true);
      expect(result.kind).toBe('MARKET');
      expect(result.budgetTier).toBe('full');
    });
  });

  describe('Budget tier mapping', () => {
    test('new_coin_analysis should get full budget', () => {
      const entity = createTokenEntity('contract_address', '0x1234567890abcdef1234567890abcdef12345678', 0.95, 'ethereum');
      const result = decideEvidenceEligibility(createInput('check this token', 'new_coin_analysis', [entity]));
      
      expect(result.budgetTier).toBe('full');
    });

    test('quick_answer should get minimal budget', () => {
      const entity = createTokenEntity('contract_address', '0x1234567890abcdef1234567890abcdef12345678', 0.95, 'ethereum');
      const result = decideEvidenceEligibility(createInput('price?', 'quick_answer', [entity]));
      
      expect(result.budgetTier).toBe('minimal');
    });

    test('decision_help should get standard budget', () => {
      const entity = createTokenEntity('contract_address', '0x1234567890abcdef1234567890abcdef12345678', 0.95, 'ethereum');
      const result = decideEvidenceEligibility(createInput('should i buy?', 'decision_help', [entity]));
      
      expect(result.budgetTier).toBe('standard');
    });
  });

  describe('Determinism (INVARIANT I4)', () => {
    test('same inputs should produce same outputs', () => {
      const input = createInput('analyze this token', 'new_coin_analysis', [
        createTokenEntity('contract_address', '0x1234567890abcdef1234567890abcdef12345678', 0.95, 'ethereum')
      ]);

      const result1 = decideEvidenceEligibility(input);
      const result2 = decideEvidenceEligibility(input);
      const result3 = decideEvidenceEligibility(input);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });
});
