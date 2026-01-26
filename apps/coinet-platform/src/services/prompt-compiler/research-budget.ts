/**
 * ╔═══════════════════════════════════════════════════════════════════════════════╗
 * ║     💰 RESEARCH BUDGET & TRIGGER POLICY                                      ║
 * ║                                                                               ║
 * ║   Controls when to use research engines and manages costs.                   ║
 * ║                                                                               ║
 * ║   TRIGGER MODES:                                                              ║
 * ║   - NO_RESEARCH: Greetings, small talk, simple price checks                  ║
 * ║   - SINGLE_RESEARCH: Basic analysis (Grok only)                              ║
 * ║   - DUAL_RESEARCH: Deep analysis (Grok + Gemini)                             ║
 * ║                                                                               ║
 * ║   BUDGET CONTROLS:                                                            ║
 * ║   - Per-user daily credits                                                    ║
 * ║   - Tier-based limits                                                         ║
 * ║   - Graceful degradation                                                      ║
 * ║                                                                               ║
 * ║   @version 1.0.0 - Production-ready, cost-conscious                          ║
 * ╚═══════════════════════════════════════════════════════════════════════════════╝
 */

import { logger } from '../../utils/logger';

// ============================================================================
// FEATURE FLAGS
// ============================================================================

export const ENABLE_DUAL_RESEARCH = process.env.ENABLE_DUAL_RESEARCH !== 'false';
export const ENABLE_GEMINI_PASS1B = process.env.ENABLE_GEMINI_PASS1B !== 'false';
export const ENABLE_RENDERER_OPENAI = process.env.ENABLE_RENDERER_OPENAI !== 'false';
export const ENABLE_DISAGREEMENT_METER = process.env.ENABLE_DISAGREEMENT_METER !== 'false';

// ============================================================================
// TYPES
// ============================================================================

export type ResearchTrigger = 'NO_RESEARCH' | 'SINGLE_RESEARCH' | 'DUAL_RESEARCH';

export type UserTier = 'free' | 'basic' | 'pro' | 'enterprise';

export interface TierConfig {
  dailyResearchCredits: number;
  maxDualResearchPerDay: number;
  maxSingleResearchPerDay: number;
  canUseGemini: boolean;
  canUseOpenAIRenderer: boolean;
  priorityQueueAccess: boolean;
}

export interface UserBudget {
  userId: string;
  tier: UserTier;
  dailyCreditsUsed: number;
  dualResearchUsed: number;
  singleResearchUsed: number;
  lastResetDate: string; // YYYY-MM-DD
}

export interface ResearchDecision {
  trigger: ResearchTrigger;
  reason: string;
  budgetStatus: 'ok' | 'degraded' | 'exhausted';
  degradationReason?: string;
}

// ============================================================================
// TIER CONFIGURATION
// ============================================================================

export const TIER_CONFIGS: Record<UserTier, TierConfig> = {
  free: {
    dailyResearchCredits: 10,
    maxDualResearchPerDay: 3,
    maxSingleResearchPerDay: 10,
    canUseGemini: false,
    canUseOpenAIRenderer: false,
    priorityQueueAccess: false,
  },
  basic: {
    dailyResearchCredits: 50,
    maxDualResearchPerDay: 15,
    maxSingleResearchPerDay: 50,
    canUseGemini: true,
    canUseOpenAIRenderer: false,
    priorityQueueAccess: false,
  },
  pro: {
    dailyResearchCredits: 200,
    maxDualResearchPerDay: 75,
    maxSingleResearchPerDay: 200,
    canUseGemini: true,
    canUseOpenAIRenderer: true,
    priorityQueueAccess: true,
  },
  enterprise: {
    dailyResearchCredits: Infinity,
    maxDualResearchPerDay: Infinity,
    maxSingleResearchPerDay: Infinity,
    canUseGemini: true,
    canUseOpenAIRenderer: true,
    priorityQueueAccess: true,
  },
};

// ============================================================================
// TRIGGER PATTERNS
// ============================================================================

// Messages that should NEVER trigger research
const NO_RESEARCH_PATTERNS = [
  // Greetings
  /^(hey|hi|hello|hola|hallo|moin|yo|sup|wassup|salut|ciao|oi|guten tag|buenos dias|bonjour)[\s!?.]*$/i,
  // Thanks
  /^(thanks|thank you|thx|danke|gracias|merci|grazie|obrigado|ty|cheers)[\s!?.]*$/i,
  // Acknowledgments
  /^(ok|okay|alright|got it|sure|yep|yes|no|nah|nope|cool|nice|great|awesome|perfect|understood|klar|verstanden)[\s!?.]*$/i,
  // Simple responses
  /^(hmm|hm|ah|oh|wow|lol|haha|😂|👍|💪|🙏|❤️)[\s!?.]*$/i,
  // Vague
  /^(news|what's up|whats up|how's it going|how are you|was geht|que tal)[\s?!.]*$/i,
];

// Messages that only need basic (single) research
const SINGLE_RESEARCH_PATTERNS = [
  // Simple price checks
  /^(btc|eth|sol|bitcoin|ethereum|solana|price)\s*(price)?[\s?]*$/i,
  /^price\s*(of)?\s*\w+[\s?]*$/i,
  /^how much is\s+\w+[\s?]*$/i,
  /^what's\s+\w+\s+(at|price|trading)[\s?]*$/i,
  // Quick status
  /^(status|check)\s+\w+$/i,
];

// Messages that warrant full dual research
const DUAL_RESEARCH_PATTERNS = [
  // Deep analysis
  /\b(analyze|analysis|analyse|deep dive|breakdown|investigate|research)\b/i,
  // Decision help
  /\b(should i|would you|do you think|what do you think)\s*(buy|sell|hold|long|short|ape|invest)/i,
  // Risk assessment
  /\b(is this|is it)\s*(a )?(rug|scam|safe|legit|risky|dangerous)/i,
  /\b(what's the|whats the)\s*(risk|potential|outlook|prognosis)/i,
  // "Why" questions about moves
  /\b(why|what happened|what's happening|explain)\b.*\b(dump|pump|crash|moon|move|drop|spike|rally|dip)/i,
  // Comparisons
  /\b(compare|versus|vs\.?|pros and cons|tradeoffs|difference between)\b/i,
  // OmniScore / full analysis
  /\b(omniscore|full analysis|score|rating)\b/i,
  // Educational depth
  /\b(how does|how do|explain how|teach me|what is the)\b.*\b(work|function|operate)/i,
];

// ============================================================================
// TRIGGER DETECTION
// ============================================================================

export function detectResearchTrigger(
  message: string,
  userBudget?: UserBudget
): ResearchDecision {
  const trimmed = message.trim();
  
  // Check NO_RESEARCH patterns first
  for (const pattern of NO_RESEARCH_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        trigger: 'NO_RESEARCH',
        reason: 'Matched no-research pattern (greeting/ack/small talk)',
        budgetStatus: 'ok',
      };
    }
  }
  
  // Check DUAL_RESEARCH patterns
  for (const pattern of DUAL_RESEARCH_PATTERNS) {
    if (pattern.test(trimmed)) {
      // Check if user can use dual research
      if (userBudget) {
        const decision = checkBudgetForDual(userBudget);
        if (decision.budgetStatus !== 'ok') {
          return decision;
        }
      }
      
      return {
        trigger: 'DUAL_RESEARCH',
        reason: 'Matched dual-research pattern (analysis/decision/comparison)',
        budgetStatus: 'ok',
      };
    }
  }
  
  // Check SINGLE_RESEARCH patterns
  for (const pattern of SINGLE_RESEARCH_PATTERNS) {
    if (pattern.test(trimmed)) {
      if (userBudget) {
        const decision = checkBudgetForSingle(userBudget);
        if (decision.budgetStatus !== 'ok') {
          return decision;
        }
      }
      
      return {
        trigger: 'SINGLE_RESEARCH',
        reason: 'Matched single-research pattern (price check/status)',
        budgetStatus: 'ok',
      };
    }
  }
  
  // Default logic based on message characteristics
  const hasQuestionMark = trimmed.includes('?');
  const hasTokenMention = /\$\w+|0x[a-fA-F0-9]{40}|[a-zA-Z0-9]{32,44}/.test(trimmed);
  const isShort = trimmed.length < 20;
  
  // Short messages without tokens = no research
  if (isShort && !hasTokenMention && !hasQuestionMark) {
    return {
      trigger: 'NO_RESEARCH',
      reason: 'Short message without token mention',
      budgetStatus: 'ok',
    };
  }
  
  // Question about a token = at least single research
  if (hasQuestionMark && hasTokenMention) {
    // Default to single unless budget allows dual
    if (userBudget) {
      const dualCheck = checkBudgetForDual(userBudget);
      if (dualCheck.budgetStatus === 'ok' && trimmed.length > 30) {
        return {
          trigger: 'DUAL_RESEARCH',
          reason: 'Token question with sufficient context',
          budgetStatus: 'ok',
        };
      }
      
      const singleCheck = checkBudgetForSingle(userBudget);
      return singleCheck.budgetStatus === 'ok'
        ? { trigger: 'SINGLE_RESEARCH', reason: 'Token question', budgetStatus: 'ok' }
        : singleCheck;
    }
    
    return {
      trigger: 'SINGLE_RESEARCH',
      reason: 'Token question',
      budgetStatus: 'ok',
    };
  }
  
  // Longer messages default to single research
  if (trimmed.length > 30 || hasQuestionMark) {
    if (userBudget) {
      const decision = checkBudgetForSingle(userBudget);
      return decision;
    }
    
    return {
      trigger: 'SINGLE_RESEARCH',
      reason: 'Default for substantive message',
      budgetStatus: 'ok',
    };
  }
  
  return {
    trigger: 'NO_RESEARCH',
    reason: 'Default fallback for short/vague message',
    budgetStatus: 'ok',
  };
}

// ============================================================================
// BUDGET CHECKS
// ============================================================================

function checkBudgetForDual(budget: UserBudget): ResearchDecision {
  const tierConfig = TIER_CONFIGS[budget.tier];
  
  // Check feature flag
  if (!ENABLE_DUAL_RESEARCH) {
    return {
      trigger: 'SINGLE_RESEARCH',
      reason: 'Dual research disabled by feature flag',
      budgetStatus: 'degraded',
      degradationReason: 'DUAL_RESEARCH feature disabled',
    };
  }
  
  // Check tier permission
  if (!tierConfig.canUseGemini) {
    return {
      trigger: 'SINGLE_RESEARCH',
      reason: 'Tier does not support dual research',
      budgetStatus: 'degraded',
      degradationReason: `${budget.tier} tier does not include Gemini`,
    };
  }
  
  // Check daily limit
  if (budget.dualResearchUsed >= tierConfig.maxDualResearchPerDay) {
    return {
      trigger: 'SINGLE_RESEARCH',
      reason: 'Daily dual research limit reached',
      budgetStatus: 'degraded',
      degradationReason: `Dual limit: ${budget.dualResearchUsed}/${tierConfig.maxDualResearchPerDay}`,
    };
  }
  
  // Check overall credits
  if (budget.dailyCreditsUsed >= tierConfig.dailyResearchCredits) {
    return {
      trigger: 'NO_RESEARCH',
      reason: 'Daily credit limit reached',
      budgetStatus: 'exhausted',
      degradationReason: `Credits: ${budget.dailyCreditsUsed}/${tierConfig.dailyResearchCredits}`,
    };
  }
  
  return {
    trigger: 'DUAL_RESEARCH',
    reason: 'Budget allows dual research',
    budgetStatus: 'ok',
  };
}

function checkBudgetForSingle(budget: UserBudget): ResearchDecision {
  const tierConfig = TIER_CONFIGS[budget.tier];
  
  // Check daily limit
  if (budget.singleResearchUsed >= tierConfig.maxSingleResearchPerDay) {
    return {
      trigger: 'NO_RESEARCH',
      reason: 'Daily single research limit reached',
      budgetStatus: 'exhausted',
      degradationReason: `Single limit: ${budget.singleResearchUsed}/${tierConfig.maxSingleResearchPerDay}`,
    };
  }
  
  // Check overall credits
  if (budget.dailyCreditsUsed >= tierConfig.dailyResearchCredits) {
    return {
      trigger: 'NO_RESEARCH',
      reason: 'Daily credit limit reached',
      budgetStatus: 'exhausted',
      degradationReason: `Credits: ${budget.dailyCreditsUsed}/${tierConfig.dailyResearchCredits}`,
    };
  }
  
  return {
    trigger: 'SINGLE_RESEARCH',
    reason: 'Budget allows single research',
    budgetStatus: 'ok',
  };
}

// ============================================================================
// BUDGET MANAGEMENT
// ============================================================================

// In-memory store (replace with Redis/DB in production)
const budgetStore = new Map<string, UserBudget>();

export function getUserBudget(userId: string, tier: UserTier = 'free'): UserBudget {
  const today = new Date().toISOString().split('T')[0];
  
  let budget = budgetStore.get(userId);
  
  if (!budget || budget.lastResetDate !== today) {
    // Create new or reset
    budget = {
      userId,
      tier,
      dailyCreditsUsed: 0,
      dualResearchUsed: 0,
      singleResearchUsed: 0,
      lastResetDate: today,
    };
    budgetStore.set(userId, budget);
  }
  
  // Update tier if changed
  budget.tier = tier;
  
  return budget;
}

export function consumeResearchCredit(
  userId: string,
  trigger: ResearchTrigger
): void {
  const budget = budgetStore.get(userId);
  if (!budget) return;
  
  switch (trigger) {
    case 'DUAL_RESEARCH':
      budget.dailyCreditsUsed += 2; // Dual costs 2 credits
      budget.dualResearchUsed += 1;
      break;
    case 'SINGLE_RESEARCH':
      budget.dailyCreditsUsed += 1;
      budget.singleResearchUsed += 1;
      break;
    case 'NO_RESEARCH':
      // No credits consumed
      break;
  }
  
  budgetStore.set(userId, budget);
  
  logger.info('💰 Research credit consumed', {
    userId,
    trigger,
    dailyCreditsUsed: budget.dailyCreditsUsed,
    dualResearchUsed: budget.dualResearchUsed,
  });
}

export function getBudgetStatus(userId: string): {
  creditsRemaining: number;
  dualRemaining: number;
  singleRemaining: number;
  percentUsed: number;
} {
  const budget = budgetStore.get(userId);
  if (!budget) {
    return { creditsRemaining: 0, dualRemaining: 0, singleRemaining: 0, percentUsed: 100 };
  }
  
  const tierConfig = TIER_CONFIGS[budget.tier];
  
  return {
    creditsRemaining: Math.max(0, tierConfig.dailyResearchCredits - budget.dailyCreditsUsed),
    dualRemaining: Math.max(0, tierConfig.maxDualResearchPerDay - budget.dualResearchUsed),
    singleRemaining: Math.max(0, tierConfig.maxSingleResearchPerDay - budget.singleResearchUsed),
    percentUsed: tierConfig.dailyResearchCredits === Infinity 
      ? 0 
      : Math.round((budget.dailyCreditsUsed / tierConfig.dailyResearchCredits) * 100),
  };
}

// ============================================================================
// COST ESTIMATION
// ============================================================================

export interface CostEstimate {
  grokCost: number;
  geminiCost: number;
  openaiCost: number;
  totalCost: number;
  currency: 'USD';
}

// Approximate costs per 1K tokens (as of 2024)
const COST_PER_1K_TOKENS = {
  grok: { input: 0.002, output: 0.006 },
  gemini: { input: 0.00025, output: 0.0005 },
  openai_gpt4o_mini: { input: 0.00015, output: 0.0006 },
  openai_gpt4o: { input: 0.005, output: 0.015 },
};

export function estimateCost(
  trigger: ResearchTrigger,
  avgInputTokens: number = 1500,
  avgOutputTokens: number = 500
): CostEstimate {
  let grokCost = 0;
  let geminiCost = 0;
  let openaiCost = 0;
  
  if (trigger === 'NO_RESEARCH') {
    // Only base model cost (minimal)
    openaiCost = (avgInputTokens / 1000) * COST_PER_1K_TOKENS.openai_gpt4o_mini.input +
                 (avgOutputTokens / 1000) * COST_PER_1K_TOKENS.openai_gpt4o_mini.output;
  } else if (trigger === 'SINGLE_RESEARCH') {
    // Grok only
    grokCost = (avgInputTokens / 1000) * COST_PER_1K_TOKENS.grok.input +
               (avgOutputTokens / 1000) * COST_PER_1K_TOKENS.grok.output;
    openaiCost = (avgInputTokens / 1000) * COST_PER_1K_TOKENS.openai_gpt4o_mini.input +
                 (avgOutputTokens / 1000) * COST_PER_1K_TOKENS.openai_gpt4o_mini.output;
  } else if (trigger === 'DUAL_RESEARCH') {
    // Grok + Gemini + OpenAI renderer
    grokCost = (avgInputTokens / 1000) * COST_PER_1K_TOKENS.grok.input +
               (avgOutputTokens / 1000) * COST_PER_1K_TOKENS.grok.output;
    geminiCost = (avgInputTokens / 1000) * COST_PER_1K_TOKENS.gemini.input +
                 (avgOutputTokens / 1000) * COST_PER_1K_TOKENS.gemini.output;
    openaiCost = (avgInputTokens / 1000) * COST_PER_1K_TOKENS.openai_gpt4o_mini.input +
                 (avgOutputTokens / 1000) * COST_PER_1K_TOKENS.openai_gpt4o_mini.output;
  }
  
  return {
    grokCost: Math.round(grokCost * 10000) / 10000,
    geminiCost: Math.round(geminiCost * 10000) / 10000,
    openaiCost: Math.round(openaiCost * 10000) / 10000,
    totalCost: Math.round((grokCost + geminiCost + openaiCost) * 10000) / 10000,
    currency: 'USD',
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  NO_RESEARCH_PATTERNS,
  SINGLE_RESEARCH_PATTERNS,
  DUAL_RESEARCH_PATTERNS,
};
