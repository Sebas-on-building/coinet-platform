/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     🚪 EVIDENCE PACK — ELIGIBILITY GATE                                       ║
 * ║                                                                               ║
 * ║   Deterministic decision: eligible/ineligible + kind + budget.                ║
 * ║   Rules are explicit, logged, and testable.                                   ║
 * ║                                                                               ║
 * ║   RULES (Priority Order):                                                     ║
 * ║   1. Greetings/small talk → NOT eligible                                      ║
 * ║   2. Educational without analysis → NOT eligible                              ║
 * ║   3. Token entity + address → TOKEN, CONFIRMED                                ║
 * ║   4. Token entity + ticker + high confidence → TOKEN, CONFIRMED               ║
 * ║   5. Token entity + ticker + low confidence → TOKEN, NEEDS_CONFIRMATION       ║
 * ║   6. Market intent without token → MARKET                                     ║
 * ║   7. Analysis intents → eligible based on kind                                ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Universal Evidence Pack Layer                              ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../utils/logger';
import {
  EligibilityInput,
  EligibilityDecision,
  DetectedTokenEntity,
  BudgetTier,
  ResolutionStatus,
  TokenCandidate,
  CONFIDENCE_THRESHOLDS,
} from './types';
import { emitEligibilityDecision } from './observability';

// ============================================================================
// PATTERN MATCHERS
// ============================================================================

const GREETING_PATTERNS = [
  /^(hey|hi|hello|hola|hallo|moin|yo|sup|wassup|salut|ciao|oi|guten tag|buenos días|bonjour)[\s!?.]*$/i,
  /^(thanks|thank you|thx|danke|gracias|merci|grazie|obrigado)[\s!?.]*$/i,
  /^(ok|okay|alright|got it|sure|yep|yes|no|nah|nope|cool|nice|great|perfect|awesome)[\s!?.]*$/i,
  /^(bye|goodbye|cya|see ya|later|adios|tschüss|tchau)[\s!?.]*$/i,
  /^(gm|gn|good morning|good night|good evening)[\s!?.]*$/i,
];

const EDUCATIONAL_PATTERNS = [
  /^what (?:is|are) (?:a |an )?(?!the price|the volume|trading)/i,
  /\bhow (?:does|do) .+ work\b/i,
  /\bexplain .+ (?:concept|term|meaning)\b/i,
  /\bdefine\b/i,
  /\bwhat does .+ mean\b/i,
  /\bteach me\b/i,
  /\beli5\b/i,
];

const MARKET_QUERY_PATTERNS = [
  /\bwhat happened\s+(?:today|now|recently|this week|in the market)\b/i,
  /\bmarket\s+(?:overview|update|summary|snapshot)\b/i,
  /\bexplain\s+(?:the|this)?\s*(?:dump|pump|crash|rally|dip|move)\b/i,
  /\bwhy\s+(?:is|did|are)\s+(?:the market|crypto|everything|btc|eth)\s+(?:dump|pump|down|up|crash)\b/i,
  /\bhow(?:'s| is)\s+the\s+market\b/i,
  /\bmarket\s+(?:fear|sentiment|mood)\b/i,
  /\bfear\s+(?:and|&)\s+greed\b/i,
];

const ANALYSIS_INTENTS = [
  'decision_help',
  'deep_analysis',
  'new_coin_analysis',
];

const PRICE_CHECK_MAJORS = [
  'btc', 'bitcoin', 'eth', 'ethereum', 'sol', 'solana', 
  'ada', 'cardano', 'avax', 'matic', 'polygon', 'dot', 'link'
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function isGreetingOrAck(message: string): boolean {
  const trimmed = message.trim();
  return GREETING_PATTERNS.some(pattern => pattern.test(trimmed));
}

function isEducationalQuery(message: string, intent: string): boolean {
  if (intent === 'learning') {
    // Check if it's purely educational or if it has analysis request
    const hasAnalysisRequest = /\banalyz|should i|risk|safe|scam|buy|sell\b/i.test(message);
    return !hasAnalysisRequest;
  }
  return EDUCATIONAL_PATTERNS.some(pattern => pattern.test(message));
}

function isMarketQuery(message: string, intent: string): boolean {
  if (MARKET_QUERY_PATTERNS.some(pattern => pattern.test(message))) {
    return true;
  }
  return ['decision_help', 'deep_analysis'].includes(intent) && !message.match(/\$[A-Z]+|\b0x[a-f0-9]{40}\b/i);
}

function isPriceCheckOnly(message: string): boolean {
  // Simple "price of X" or "X price" patterns for majors
  const pricePattern = /^(?:price\s+(?:of\s+)?|what(?:'s| is) (?:the )?price (?:of )?)?(\w+)\s*(?:price)?[\s?]*$/i;
  const match = message.trim().match(pricePattern);
  
  if (match) {
    const symbol = match[1]?.toLowerCase();
    return PRICE_CHECK_MAJORS.includes(symbol);
  }
  
  return false;
}

function mapIntentToBudget(intent: string): BudgetTier {
  switch (intent) {
    case 'quick_answer':
      return 'minimal';
    case 'decision_help':
      return 'standard';
    case 'deep_analysis':
    case 'new_coin_analysis':
      return 'full';
    default:
      return 'standard';
  }
}

function evaluateTokenConfidence(entity: DetectedTokenEntity): {
  confidenceLevel: 'high' | 'medium' | 'low';
  isConfirmed: boolean;
} {
  const confidence = entity.ref.confidence;
  
  if (entity.ref.type === 'contract_address') {
    return { confidenceLevel: 'high', isConfirmed: true };
  }
  
  if (confidence >= CONFIDENCE_THRESHOLDS.HIGH) {
    return { confidenceLevel: 'high', isConfirmed: true };
  }
  
  if (confidence >= CONFIDENCE_THRESHOLDS.MEDIUM) {
    return { confidenceLevel: 'medium', isConfirmed: false };
  }
  
  return { confidenceLevel: 'low', isConfirmed: false };
}

// ============================================================================
// MAIN ELIGIBILITY FUNCTION
// ============================================================================

/**
 * Decide if a request is eligible for Evidence Pack building.
 * This is the central gate that determines if/how we build the pack.
 * 
 * @param input - The eligibility input containing message, intent, entities, state
 * @returns EligibilityDecision with eligible flag, kind, budget, and resolution status
 */
export function decideEvidenceEligibility(input: EligibilityInput): EligibilityDecision {
  const { userMessage, detectedIntent, tokenEntities, conversationState } = input;
  const lowerMessage = userMessage.toLowerCase().trim();
  const hasTokenEntity = tokenEntities.length > 0;
  const primaryEntity = tokenEntities[0] || null;

  // =========================================================================
  // RULE 1: Greetings and acknowledgments → NOT eligible
  // =========================================================================
  if (isGreetingOrAck(lowerMessage)) {
    const decision: EligibilityDecision = {
      eligible: false,
      reason: 'Greeting or acknowledgment',
      kind: 'NONE',
      budgetTier: 'minimal',
      resolutionStatus: 'NOT_REQUIRED',
      detectedIntent,
      tokenEntitiesCount: tokenEntities.length,
    };
    emitEligibilityDecision(decision, userMessage);
    return decision;
  }

  // =========================================================================
  // RULE 2: Educational queries without analysis → NOT eligible
  // =========================================================================
  if (isEducationalQuery(userMessage, detectedIntent) && !hasTokenEntity) {
    const decision: EligibilityDecision = {
      eligible: false,
      reason: 'Educational query, no analysis needed',
      kind: 'NONE',
      budgetTier: 'minimal',
      resolutionStatus: 'NOT_REQUIRED',
      detectedIntent,
      tokenEntitiesCount: tokenEntities.length,
    };
    emitEligibilityDecision(decision, userMessage);
    return decision;
  }

  // =========================================================================
  // RULE 3: Troubleshoot intent without token → NOT eligible
  // =========================================================================
  if (detectedIntent === 'troubleshoot' && !hasTokenEntity) {
    const decision: EligibilityDecision = {
      eligible: false,
      reason: 'Support query without asset',
      kind: 'NONE',
      budgetTier: 'minimal',
      resolutionStatus: 'NOT_REQUIRED',
      detectedIntent,
      tokenEntitiesCount: tokenEntities.length,
    };
    emitEligibilityDecision(decision, userMessage);
    return decision;
  }

  // =========================================================================
  // TOKEN PATH: Rules 4-7
  // =========================================================================
  if (hasTokenEntity && primaryEntity) {
    const { confidenceLevel, isConfirmed } = evaluateTokenConfidence(primaryEntity);

    // RULE 4: Direct address provided → CONFIRMED
    if (primaryEntity.ref.type === 'contract_address') {
      const decision: EligibilityDecision = {
        eligible: true,
        reason: 'Direct contract address provided',
        kind: 'TOKEN',
        budgetTier: mapIntentToBudget(detectedIntent),
        resolutionStatus: 'CONFIRMED',
        detectedIntent,
        tokenEntitiesCount: tokenEntities.length,
      };
      emitEligibilityDecision(decision, userMessage);
      return decision;
    }

    // RULE 5: Ticker with high confidence → CONFIRMED
    if (isConfirmed) {
      const decision: EligibilityDecision = {
        eligible: true,
        reason: 'High confidence ticker match',
        kind: 'TOKEN',
        budgetTier: mapIntentToBudget(detectedIntent),
        resolutionStatus: 'CONFIRMED',
        detectedIntent,
        tokenEntitiesCount: tokenEntities.length,
      };
      emitEligibilityDecision(decision, userMessage);
      return decision;
    }

    // RULE 6: Ticker with low/medium confidence → NEEDS_CONFIRMATION
    const decision: EligibilityDecision = {
      eligible: true,
      reason: confidenceLevel === 'medium' 
        ? 'Medium confidence ticker match, proceeding tentatively'
        : 'Ambiguous ticker, clarification required',
      kind: 'TOKEN',
      budgetTier: 'minimal', // Minimal fetch until confirmed
      resolutionStatus: confidenceLevel === 'medium' ? 'TENTATIVE' : 'NEEDS_CONFIRMATION',
      detectedIntent,
      tokenEntitiesCount: tokenEntities.length,
      // tokenCandidates would be populated by the resolver
    };
    emitEligibilityDecision(decision, userMessage);
    return decision;
  }

  // =========================================================================
  // MARKET PATH: Rules 8-13
  // =========================================================================

  // RULE 8: Simple price check for majors → MARKET, minimal
  if (isPriceCheckOnly(lowerMessage)) {
    const decision: EligibilityDecision = {
      eligible: true,
      reason: 'Simple price check for major asset',
      kind: 'MARKET',
      budgetTier: 'minimal',
      resolutionStatus: 'NOT_REQUIRED',
      detectedIntent,
      tokenEntitiesCount: tokenEntities.length,
    };
    emitEligibilityDecision(decision, userMessage);
    return decision;
  }

  // RULE 9: Market query patterns → MARKET
  if (isMarketQuery(lowerMessage, detectedIntent)) {
    const decision: EligibilityDecision = {
      eligible: true,
      reason: 'Market analysis query',
      kind: 'MARKET',
      budgetTier: detectedIntent === 'deep_analysis' ? 'full' : 'standard',
      resolutionStatus: 'NOT_REQUIRED',
      detectedIntent,
      tokenEntitiesCount: tokenEntities.length,
    };
    emitEligibilityDecision(decision, userMessage);
    return decision;
  }

  // RULE 10: Analysis intents without token → MARKET
  if (ANALYSIS_INTENTS.includes(detectedIntent) && !hasTokenEntity) {
    const decision: EligibilityDecision = {
      eligible: true,
      reason: `${detectedIntent} intent requires market context`,
      kind: 'MARKET',
      budgetTier: mapIntentToBudget(detectedIntent),
      resolutionStatus: 'NOT_REQUIRED',
      detectedIntent,
      tokenEntitiesCount: tokenEntities.length,
    };
    emitEligibilityDecision(decision, userMessage);
    return decision;
  }

  // =========================================================================
  // FALLBACK: Check for any analysis signals
  // =========================================================================
  
  // Check for analysis keywords even if intent classifier missed them
  const hasAnalysisKeywords = /\b(analyze|analysis|should i|risk|safe|scam|check|review)\b/i.test(userMessage);
  
  if (hasAnalysisKeywords) {
    const decision: EligibilityDecision = {
      eligible: true,
      reason: 'Analysis keywords detected',
      kind: 'MARKET',
      budgetTier: 'standard',
      resolutionStatus: 'NOT_REQUIRED',
      detectedIntent,
      tokenEntitiesCount: tokenEntities.length,
    };
    emitEligibilityDecision(decision, userMessage);
    return decision;
  }

  // =========================================================================
  // DEFAULT: Not eligible
  // =========================================================================
  const decision: EligibilityDecision = {
    eligible: false,
    reason: 'No analysis trigger detected',
    kind: 'NONE',
    budgetTier: 'minimal',
    resolutionStatus: 'NOT_REQUIRED',
    detectedIntent,
    tokenEntitiesCount: tokenEntities.length,
  };
  emitEligibilityDecision(decision, userMessage);
  return decision;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  isGreetingOrAck,
  isEducationalQuery,
  isMarketQuery,
  isPriceCheckOnly,
  mapIntentToBudget,
  evaluateTokenConfidence,
  GREETING_PATTERNS,
  EDUCATIONAL_PATTERNS,
  MARKET_QUERY_PATTERNS,
  ANALYSIS_INTENTS,
  PRICE_CHECK_MAJORS,
};
