/**
 * 💎 COINET INVESTMENT TRACKER
 * 
 * Stage 4 of the Retention Loop: Investment Mechanics
 * Increase switching costs by accumulating user data and personalization
 * 
 * 10 Investment Actions (Low → High Friction):
 * 1. Add Coin to Watchlist (Very Low)
 * 2. Set Price Alert (Low)
 * 3. Enable Morning Digest (Low)
 * 4. Save Chat History (Very Low - auto-enabled)
 * 5. Share Risk Tolerance (Medium-Low)
 * 6. Set Portfolio Holdings (Medium)
 * 7. Configure Regime Preferences (Medium)
 * 8. Write Trading Notes (Medium-High)
 * 9. Connect Wallet (High)
 * 10. Invite Friends (High)
 * 
 * Anti-Annoyance Principles:
 * - Never prompt if user already has too many items (e.g., ≥15 watchlist coins)
 * - Don't prompt if user just declined/deleted same action
 * - Presented as optional quick-pick, not forms
 * - Clear "Skip" button always prominent
 * 
 * @module retention/investment-tracker
 * @version 1.0.0
 */

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { prismaRetention } from './prisma-retention';
import {
  InvestmentAction,
  InvestmentFriction,
  InvestmentActionConfig,
  InvestmentPrompt,
} from './types';

// =============================================================================
// INVESTMENT ACTION CONFIGURATIONS
// =============================================================================

const INVESTMENT_CONFIGS: Record<InvestmentAction, InvestmentActionConfig> = {
  watchlist_add: {
    action: 'watchlist_add',
    friction: 'very_low',
    userValue: 'Quick access to prices + OmniScore updates',
    systemValue: 'Learns user\'s interests, enables personalized alerts',
    promptMoment: 'After any coin analysis query: "Add [coin] to watchlist?"',
    antiAnnoyance: 'Don\'t prompt if user already has ≥15 watchlist coins',
    cooldownDays: 0,
  },
  
  price_alert: {
    action: 'price_alert',
    friction: 'low',
    userValue: 'Passive monitoring without checking app',
    systemValue: 'Learns user\'s entry/exit zones, risk tolerance',
    promptMoment: 'After user asks "what price should I buy at": "Want an alert at $[X]?"',
    antiAnnoyance: 'Don\'t prompt if user just deleted an alert for same coin',
    cooldownDays: 1,
  },
  
  morning_digest: {
    action: 'morning_digest',
    friction: 'low',
    userValue: 'Daily intelligence summary before market',
    systemValue: 'Locks in daily habit trigger',
    promptMoment: 'After 3rd consecutive day of morning sessions',
    antiAnnoyance: 'Only ask once; if declined, wait 14 days',
    cooldownDays: 14,
  },
  
  save_history: {
    action: 'save_history',
    friction: 'very_low',
    userValue: 'Can reference past analyses',
    systemValue: 'Builds conversation memory for better personalization',
    promptMoment: 'Auto-enabled; user opts out if desired',
    antiAnnoyance: 'Never prompt; it\'s on by default',
    cooldownDays: 0,
  },
  
  risk_tolerance: {
    action: 'risk_tolerance',
    friction: 'medium_low',
    userValue: 'Get recommendations tuned to their style',
    systemValue: 'Enables Decision Help personalization',
    promptMoment: 'After user asks 2nd "should I buy" question',
    antiAnnoyance: 'Presented as optional quick-pick, not form. Skip button prominent.',
    cooldownDays: 7,
  },
  
  portfolio_set: {
    action: 'portfolio_set',
    friction: 'medium',
    userValue: 'Portfolio-specific alerts (e.g., "your holdings are down 8%")',
    systemValue: 'Learns actual exposure, enables conviction-weighted insights',
    promptMoment: 'When user asks about multiple coins they seem to hold',
    antiAnnoyance: 'Never mandatory. Privacy-first: "Stored locally, never shared."',
    cooldownDays: 14,
  },
  
  regime_prefs: {
    action: 'regime_prefs',
    friction: 'medium',
    userValue: 'Only get alerted for regime shifts that matter to them',
    systemValue: 'Reduces alert fatigue, increases engagement with relevant shifts',
    promptMoment: 'After first regime shift alert',
    antiAnnoyance: 'Default is "all"; only ask if user ignores 2 regime alerts',
    cooldownDays: 30,
  },
  
  trading_notes: {
    action: 'trading_notes',
    friction: 'medium_high',
    userValue: 'Track rationale, review past decisions',
    systemValue: 'Captures decision context for better validation/learnings',
    promptMoment: 'After user asks "should I buy"',
    antiAnnoyance: 'Totally optional; power-user feature, not pushed',
    cooldownDays: 7,
  },
  
  wallet_connect: {
    action: 'wallet_connect',
    friction: 'high',
    userValue: 'Auto-populate watchlist from holdings, get portfolio-level OmniScore',
    systemValue: 'True portfolio exposure, enables PnL tracking + validation',
    promptMoment: 'Week 3, only if user has ≥10 watchlist adds',
    antiAnnoyance: 'Never required. Clear "view-only" language. Easy disconnect.',
    cooldownDays: 30,
  },
  
  referral: {
    action: 'referral',
    friction: 'high',
    userValue: 'Friends get intelligent crypto assistant',
    systemValue: 'Growth loop',
    promptMoment: 'After user has 7-day streak + asks ≥20 queries',
    antiAnnoyance: 'Once per month max. No incentives (stay authentic). Easy dismiss.',
    cooldownDays: 30,
  },
};

// =============================================================================
// INVESTMENT ACTION TRACKING
// =============================================================================

/**
 * Record a completed investment action
 */
export async function recordInvestmentAction(
  userId: string,
  action: InvestmentAction,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await prismaRetention.userInvestmentAction.create({
      data: {
        userId,
        actionType: action,
        symbol: metadata?.symbol as string ?? null,
        metadata: metadata ?? null,
        wasPrompted: metadata?.wasPrompted as boolean ?? false,
        promptType: metadata?.promptType as string ?? null,
        promptContext: metadata?.promptContext as string ?? null,
        completedAt: new Date(),
        promptedAt: metadata?.promptedAt as Date ?? null,
      },
    });
    
    logger.debug('💎 Investment action recorded', {
      userId,
      action,
      symbol: metadata?.symbol,
    });
    
    // Update lifecycle state
    await updateLifecycleFromInvestment(userId, action);
  } catch (error) {
    logger.warn('💎 Failed to record investment action', { userId, action, error });
  }
}

/**
 * Check if user should be prompted for an action
 */
export async function shouldPromptAction(
  userId: string,
  action: InvestmentAction,
  context?: Record<string, unknown>
): Promise<{ shouldPrompt: boolean; reason?: string }> {
  const config = INVESTMENT_CONFIGS[action];
  
  try {
    // Check cooldown
    if (config.cooldownDays > 0) {
      const lastPrompt = await prismaRetention.userInvestmentAction.findFirst({
        where: {
          userId,
          actionType: action,
          promptedAt: { not: null },
        },
        orderBy: { promptedAt: 'desc' },
      });
      
      if (lastPrompt?.promptedAt) {
        const daysSincePrompt = (Date.now() - lastPrompt.promptedAt.getTime()) / (24 * 60 * 60 * 1000);
        if (daysSincePrompt < config.cooldownDays) {
          return {
            shouldPrompt: false,
            reason: `Cooldown: ${config.cooldownDays - Math.floor(daysSincePrompt)} days remaining`,
          };
        }
      }
    }
    
    // Action-specific checks
    switch (action) {
      case 'watchlist_add':
        return await checkWatchlistAddPrompt(userId, context);
      
      case 'price_alert':
        return await checkPriceAlertPrompt(userId, context);
      
      case 'morning_digest':
        return await checkMorningDigestPrompt(userId);
      
      case 'risk_tolerance':
        return await checkRiskTolerancePrompt(userId);
      
      case 'portfolio_set':
        return await checkPortfolioSetPrompt(userId, context);
      
      case 'regime_prefs':
        return await checkRegimePrefsPrompt(userId);
      
      case 'wallet_connect':
        return await checkWalletConnectPrompt(userId);
      
      case 'referral':
        return await checkReferralPrompt(userId);
      
      default:
        return { shouldPrompt: false, reason: 'Action not configured for prompting' };
    }
  } catch (error) {
    logger.debug('Prompt check error', { userId, action, error });
    return { shouldPrompt: false, reason: 'Error checking prompt eligibility' };
  }
}

/**
 * Generate a prompt for an investment action
 */
export function generatePrompt(
  userId: string,
  action: InvestmentAction,
  context?: Record<string, unknown>
): InvestmentPrompt {
  const config = INVESTMENT_CONFIGS[action];
  
  const prompts: Record<InvestmentAction, { text: string; cta: string; skip: string }> = {
    watchlist_add: {
      text: context?.symbol ? `Add ${context.symbol} to your watchlist?` : 'Add to watchlist?',
      cta: 'Add to Watchlist',
      skip: 'Not now',
    },
    price_alert: {
      text: context?.price ? `Want an alert when it hits $${context.price}?` : 'Set a price alert?',
      cta: 'Set Alert',
      skip: 'Skip',
    },
    morning_digest: {
      text: 'Get your watchlist summary every morning?',
      cta: 'Enable Digest',
      skip: 'No thanks',
    },
    save_history: {
      text: 'Save your chat history for future reference?',
      cta: 'Enable',
      skip: 'Skip',
    },
    risk_tolerance: {
      text: 'Helps if I know your risk style—conservative, moderate, or aggressive?',
      cta: 'Tell me',
      skip: 'Skip for now',
    },
    portfolio_set: {
      text: 'Want me to remember what you own? (stored privately)',
      cta: 'Add Holdings',
      skip: 'Skip',
    },
    regime_prefs: {
      text: 'Which regime changes matter to you?',
      cta: 'Configure',
      skip: 'All is fine',
    },
    trading_notes: {
      text: 'Want to note why you\'re considering this?',
      cta: 'Add Note',
      skip: 'Skip',
    },
    wallet_connect: {
      text: 'Connect wallet to auto-sync your portfolio? (view-only)',
      cta: 'Connect',
      skip: 'Not yet',
    },
    referral: {
      text: 'Know someone who\'d dig this?',
      cta: 'Share Coinet',
      skip: 'Not now',
    },
  };
  
  const prompt = prompts[action];
  
  return {
    id: `prompt_${action}_${Date.now()}`,
    userId,
    action,
    promptText: prompt.text,
    ctaText: prompt.cta,
    skipText: prompt.skip,
    contextTrigger: context?.trigger as string ?? config.promptMoment,
    symbol: context?.symbol as string ?? undefined,
    promptedAt: new Date(),
    accepted: false,
    skipped: false,
  };
}

// =============================================================================
// ACTION-SPECIFIC PROMPT CHECKS
// =============================================================================

async function checkWatchlistAddPrompt(
  userId: string,
  context?: Record<string, unknown>
): Promise<{ shouldPrompt: boolean; reason?: string }> {
  // Check watchlist size
  const watchlistCount = await prisma.userWatchlist.count({
      where: { userId, isArchived: false } as any,
  });
  
  if (watchlistCount >= 15) {
    return { shouldPrompt: false, reason: 'Watchlist at capacity (15 coins)' };
  }
  
  // Check if coin already in watchlist
  if (context?.symbol) {
    const existing = await prisma.userWatchlist.findFirst({
      where: {
        userId,
        symbol: (context.symbol as string).toUpperCase(),
        isArchived: false,
      } as any,
    });
    
    if (existing) {
      return { shouldPrompt: false, reason: 'Coin already in watchlist' };
    }
  }
  
  return { shouldPrompt: true };
}

async function checkPriceAlertPrompt(
  userId: string,
  context?: Record<string, unknown>
): Promise<{ shouldPrompt: boolean; reason?: string }> {
  if (!context?.symbol) {
    return { shouldPrompt: false, reason: 'No symbol provided' };
  }
  
  // Check if alert already exists for this coin
  const existingAlert = await prismaRetention.retentionAlert.findFirst({
    where: {
      userId,
      symbol: (context.symbol as string).toUpperCase(),
      alertType: 'price_threshold',
      isActive: true,
    },
  });
  
  if (existingAlert) {
    return { shouldPrompt: false, reason: 'Alert already exists for this coin' };
  }
  
  // Check if user recently deleted an alert for this coin
  const recentDeletion = await prismaRetention.retentionAlert.findFirst({
    where: {
      userId,
      symbol: (context.symbol as string).toUpperCase(),
      isActive: false,
      updatedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  
  if (recentDeletion) {
    return { shouldPrompt: false, reason: 'User recently deleted alert for this coin' };
  }
  
  return { shouldPrompt: true };
}

async function checkMorningDigestPrompt(userId: string): Promise<{ shouldPrompt: boolean; reason?: string }> {
  // Check if already enabled
  const preferences = await prisma.userPreferences.findUnique({
    where: { userId },
  });
  
  if ((preferences as any)?.morningDigestEnabled) {
    return { shouldPrompt: false, reason: 'Morning digest already enabled' };
  }
  
  // Check for 3 consecutive morning sessions
  const sessions = await prismaRetention.userSession.findMany({
    where: {
      userId,
      sessionStart: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { sessionStart: 'desc' },
  });
  
  let consecutiveMornings = 0;
  let lastMorningDate = '';
  
  for (const session of sessions) {
    const hour = session.sessionStart.getHours();
    const dateStr = session.sessionStart.toISOString().split('T')[0];
    
    if (hour >= 6 && hour < 10 && dateStr !== lastMorningDate) {
      consecutiveMornings++;
      lastMorningDate = dateStr;
    }
  }
  
  if (consecutiveMornings < 3) {
    return { shouldPrompt: false, reason: 'Not enough morning sessions yet' };
  }
  
  return { shouldPrompt: true };
}

async function checkRiskTolerancePrompt(userId: string): Promise<{ shouldPrompt: boolean; reason?: string }> {
  // Check if already set
  const preferences = await prisma.userPreferences.findUnique({
    where: { userId },
  });
  
  if (preferences?.riskTolerance) {
    return { shouldPrompt: false, reason: 'Risk tolerance already set' };
  }
  
  // Check for 2+ "should I buy" queries
  const decisionQueries = await prismaRetention.userQuery.count({
    where: {
      userId,
      intent: 'decision_help',
    },
  });
  
  if (decisionQueries < 2) {
    return { shouldPrompt: false, reason: 'Not enough decision queries yet' };
  }
  
  return { shouldPrompt: true };
}

async function checkPortfolioSetPrompt(
  userId: string,
  context?: Record<string, unknown>
): Promise<{ shouldPrompt: boolean; reason?: string }> {
  // Check if already has portfolio
  const portfolioCount = await prisma.userPortfolio.count({
    where: { userId },
  });
  
  if (portfolioCount > 0) {
    return { shouldPrompt: false, reason: 'Portfolio already configured' };
  }
  
  // Check lifecycle state
  const lifecycle = await prismaRetention.userLifecycleState.findUnique({
    where: { userId },
  });
  
  if (!lifecycle || lifecycle.daysSinceSignup < 7) {
    return { shouldPrompt: false, reason: 'User too new for portfolio prompt' };
  }
  
  return { shouldPrompt: true };
}

async function checkRegimePrefsPrompt(userId: string): Promise<{ shouldPrompt: boolean; reason?: string }> {
  // Check if user has ignored 2+ regime alerts
  const regimeNotifications = await prismaRetention.notificationDelivery.findMany({
    where: {
      userId,
      notificationType: 'regime_shift',
      status: { in: ['sent', 'delivered'] },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  
  const ignored = regimeNotifications.filter(n => !n.openedAt).length;
  
  if (ignored < 2) {
    return { shouldPrompt: false, reason: 'User engaging with regime alerts' };
  }
  
  return { shouldPrompt: true };
}

async function checkWalletConnectPrompt(userId: string): Promise<{ shouldPrompt: boolean; reason?: string }> {
  // Check lifecycle requirements
  const lifecycle = await prismaRetention.userLifecycleState.findUnique({
    where: { userId },
  });
  
  if (!lifecycle) {
    return { shouldPrompt: false, reason: 'No lifecycle state' };
  }
  
  if (lifecycle.daysSinceSignup < 21) { // Week 3+
    return { shouldPrompt: false, reason: 'User not in Week 3 yet' };
  }
  
  if (lifecycle.watchlistSize < 10) {
    return { shouldPrompt: false, reason: 'Not enough watchlist items' };
  }
  
  if (lifecycle.walletConnected) {
    return { shouldPrompt: false, reason: 'Wallet already connected' };
  }
  
  return { shouldPrompt: true };
}

async function checkReferralPrompt(userId: string): Promise<{ shouldPrompt: boolean; reason?: string }> {
  // Check lifecycle requirements
  const lifecycle = await prismaRetention.userLifecycleState.findUnique({
    where: { userId },
  });
  
  if (!lifecycle) {
    return { shouldPrompt: false, reason: 'No lifecycle state' };
  }
  
  if (lifecycle.currentStreak < 7) {
    return { shouldPrompt: false, reason: 'No 7-day streak yet' };
  }
  
  // Check query count
  const queryCount = await prismaRetention.userQuery.count({
    where: { userId },
  });
  
  if (queryCount < 20) {
    return { shouldPrompt: false, reason: 'Not enough queries yet' };
  }
  
  return { shouldPrompt: true };
}

// =============================================================================
// LIFECYCLE INTEGRATION
// =============================================================================

async function updateLifecycleFromInvestment(userId: string, action: InvestmentAction): Promise<void> {
  try {
    switch (action) {
      case 'watchlist_add':
        await prismaRetention.userLifecycleState.update({
          where: { userId },
          data: { watchlistSize: { increment: 1 } },
        });
        break;
      
      case 'price_alert':
        await prismaRetention.userLifecycleState.update({
          where: { userId },
          data: { alertsConfigured: { increment: 1 } },
        });
        break;
      
      case 'morning_digest':
        await prismaRetention.userLifecycleState.update({
          where: { userId },
          data: { morningDigestEnabled: true },
        });
        break;
      
      case 'risk_tolerance':
        await prismaRetention.userLifecycleState.update({
          where: { userId },
          data: { riskToleranceSet: true },
        });
        break;
      
      case 'portfolio_set':
        await prismaRetention.userLifecycleState.update({
          where: { userId },
          data: { portfolioShared: true },
        });
        break;
      
      case 'wallet_connect':
        await prismaRetention.userLifecycleState.update({
          where: { userId },
          data: { walletConnected: true },
        });
        break;
    }
  } catch {
    // Ignore errors - lifecycle state might not exist yet
  }
}

// =============================================================================
// INVESTMENT DEPTH ANALYSIS
// =============================================================================

/**
 * Calculate user's investment depth score
 */
export async function calculateInvestmentDepth(userId: string): Promise<{
  score: number;
  level: 'shallow' | 'medium' | 'deep' | 'invested';
  actions: InvestmentAction[];
  nextSuggested: InvestmentAction | null;
}> {
  const actions: InvestmentAction[] = [];
  let score = 0;
  
  // Check each investment action
  const [watchlistCount, alertCount, preferences, portfolioCount, lifecycle] = await Promise.all([
    prisma.userWatchlist.count({ where: { userId, isArchived: false } as any }),
    prismaRetention.retentionAlert.count({ where: { userId, isActive: true } }),
    prisma.userPreferences.findUnique({ where: { userId } }),
    prisma.userPortfolio.count({ where: { userId } }),
    prismaRetention.userLifecycleState.findUnique({ where: { userId } }),
  ]);
  
  // Score each action
  if (watchlistCount > 0) {
    actions.push('watchlist_add');
    score += Math.min(watchlistCount, 10) * 2; // Max 20 points
  }
  
  if (alertCount > 0) {
    actions.push('price_alert');
    score += Math.min(alertCount, 5) * 4; // Max 20 points
  }
  
  if ((preferences as any)?.morningDigestEnabled) {
    actions.push('morning_digest');
    score += 15;
  }
  
  if (preferences?.riskTolerance) {
    actions.push('risk_tolerance');
    score += 10;
  }
  
  if (portfolioCount > 0) {
    actions.push('portfolio_set');
    score += 15;
  }
  
  if (lifecycle?.walletConnected) {
    actions.push('wallet_connect');
    score += 20;
  }
  
  // Determine level
  let level: 'shallow' | 'medium' | 'deep' | 'invested';
  if (score >= 70) level = 'invested';
  else if (score >= 40) level = 'deep';
  else if (score >= 15) level = 'medium';
  else level = 'shallow';
  
  // Suggest next action
  let nextSuggested: InvestmentAction | null = null;
  
  if (!actions.includes('watchlist_add') || watchlistCount < 3) {
    nextSuggested = 'watchlist_add';
  } else if (!actions.includes('price_alert')) {
    nextSuggested = 'price_alert';
  } else if (!actions.includes('morning_digest')) {
    nextSuggested = 'morning_digest';
  } else if (!actions.includes('risk_tolerance')) {
    nextSuggested = 'risk_tolerance';
  } else if (!actions.includes('portfolio_set')) {
    nextSuggested = 'portfolio_set';
  }
  
  return { score, level, actions, nextSuggested };
}

// =============================================================================
// EXPORTS
// =============================================================================

export const investmentTracker = {
  record: recordInvestmentAction,
  shouldPrompt: shouldPromptAction,
  generatePrompt,
  calculateDepth: calculateInvestmentDepth,
  configs: INVESTMENT_CONFIGS,
};

export default investmentTracker;
