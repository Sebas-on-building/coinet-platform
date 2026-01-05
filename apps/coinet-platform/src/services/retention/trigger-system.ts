/**
 * 🎯 COINET RETENTION TRIGGER SYSTEM
 * 
 * Stage 1 of the Retention Loop: Surface timely, relevant intelligence moments
 * that pull users back into Coinet WITHOUT creating anxiety.
 * 
 * 7 Trigger Mechanisms:
 * 1. Regime Shift Detection Push
 * 2. Watchlist Threshold Alerts
 * 3. Morning Intelligence Digest
 * 4. Opportunity Moments
 * 5. Conversational Memory Trigger
 * 6. Social Proof (Tribe Trigger)
 * 7. Habit Reinforcement
 * 
 * All triggers respect guardrails:
 * - Max 2 push notifications per day (unless user-set)
 * - Intelligence over noise (decision-ready data only)
 * - No panic engineering (no URGENT/FOMO language)
 * 
 * @module retention/trigger-system
 * @version 1.0.0
 */

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { prismaRetention } from './prisma-retention';
import {
  TriggerType,
  TriggerEvent,
  TriggerConfig,
  RegimeShiftTrigger,
  WatchlistThresholdTrigger,
  MorningDigestTrigger,
  OpportunityMomentTrigger,
  ConversationMemoryTrigger,
  SocialProofTrigger,
  HabitReinforcementTrigger,
  ExternalTriggerChannel,
  GUARDRAILS,
} from './types';

// =============================================================================
// CONFIGURATION
// =============================================================================

const TRIGGER_CONFIGS: Record<TriggerType, TriggerConfig> = {
  regime_shift: {
    type: 'regime_shift',
    channel: 'push',
    maxFrequencyHours: 6,
    requiresWatchlist: true,
  },
  watchlist_threshold: {
    type: 'watchlist_threshold',
    channel: 'push',
    maxFrequencyHours: 0,  // User-defined frequency
    requiresWatchlist: true,
  },
  morning_digest: {
    type: 'morning_digest',
    channel: 'push',
    maxFrequencyHours: 24,
    requiresWatchlist: true,
  },
  opportunity_moment: {
    type: 'opportunity_moment',
    channel: 'in_app',  // Only in-app banner
    maxFrequencyHours: 24,
    requiresWatchlist: true,
    minQueryHistory: 3,
  },
  conversation_memory: {
    type: 'conversation_memory',
    channel: 'in_app',  // Optional push
    maxFrequencyHours: 48,
    requiresWatchlist: false,
  },
  social_proof: {
    type: 'social_proof',
    channel: 'in_app',  // Never push
    maxFrequencyHours: 0,  // Only shown when relevant
    requiresWatchlist: false,
  },
  habit_reinforcement: {
    type: 'habit_reinforcement',
    channel: 'push',
    maxFrequencyHours: 24,
    requiresWatchlist: true,
  },
};

// =============================================================================
// TRIGGER EVALUATION ENGINE
// =============================================================================

interface TriggerContext {
  userId: string;
  watchlist: Array<{ symbol: string; addedAt: Date; priceAtAdd?: number; omniscoreAtAdd?: number }>;
  recentQueries: Array<{ symbol: string; queryDate: Date; omniscoreAtQuery?: number }>;
  userPreferences: {
    morningDigestEnabled: boolean;
    regimeAlertsEnabled: boolean;
    typicalSessionTime?: string;
    maxPushPerDay: number;
  };
  sessionHistory: {
    lastSessionDate?: Date;
    currentStreak: number;
  };
  todayPushCount: number;
}

/**
 * Evaluate all triggers for a user
 */
export async function evaluateTriggers(userId: string): Promise<TriggerEvent[]> {
  const startTime = performance.now();
  const triggers: TriggerEvent[] = [];
  
  try {
    // Build context
    const context = await buildTriggerContext(userId);
    
    // Check daily push limit
    const canSendPush = context.todayPushCount < Math.min(
      context.userPreferences.maxPushPerDay,
      GUARDRAILS.MAX_PUSH_PER_DAY
    );
    
    // Evaluate each trigger type
    const evaluations = await Promise.all([
      evaluateRegimeShift(context),
      evaluateWatchlistThresholds(context),
      evaluateMorningDigest(context),
      evaluateOpportunityMoments(context),
      evaluateConversationMemory(context),
      evaluateSocialProof(context),
      evaluateHabitReinforcement(context),
    ]);
    
    // Flatten and filter by push limit
    for (const triggerList of evaluations) {
      for (const trigger of triggerList) {
        if (trigger.channel === 'push' && !canSendPush) {
          // Downgrade to in-app if push limit exceeded
          trigger.channel = 'in_app';
        }
        
        // Only include triggers with sufficient signal strength
        if (trigger.signalStrength >= GUARDRAILS.MIN_SIGNAL_STRENGTH) {
          triggers.push(trigger);
        }
      }
    }
    
    const processingTime = performance.now() - startTime;
    logger.debug('🎯 Trigger evaluation complete', {
      userId,
      triggersFound: triggers.length,
      processingTimeMs: processingTime.toFixed(1),
    });
    
    return triggers;
  } catch (error) {
    logger.error('🎯 Trigger evaluation failed', { userId, error });
    return [];
  }
}

// =============================================================================
// CONTEXT BUILDER
// =============================================================================

async function buildTriggerContext(userId: string): Promise<TriggerContext> {
  const [watchlist, recentQueries, preferences, lifecycle, todayNotifications] = await Promise.all([
    // Get watchlist
    prisma.userWatchlist.findMany({
      where: { userId, isArchived: false } as any,
      orderBy: { addedAt: 'desc' },
    }).catch(() => []),
    
    // Get recent queries (last 7 days)
    prismaRetention.userQuery.findMany({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }).catch(() => []),
    
    // Get preferences
    prisma.userPreferences.findUnique({
      where: { userId },
    }).catch(() => null),
    
    // Get lifecycle state
    prismaRetention.userLifecycleState.findUnique({
      where: { userId },
    }).catch(() => null),
    
    // Count today's push notifications
    prismaRetention.notificationDelivery.count({
      where: {
        userId,
        channel: 'push',
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        status: { in: ['sent', 'delivered'] },
      },
    }).catch(() => 0),
  ]);
  
  return {
    userId,
    watchlist: watchlist.map(w => ({
      symbol: w.symbol,
      addedAt: w.addedAt,
      priceAtAdd: w.priceAtAdd ?? undefined,
      omniscoreAtAdd: w.omniscoreAtAdd ?? undefined,
    })),
    recentQueries: recentQueries.flatMap(q => 
      q.symbols.map(symbol => ({
        symbol,
        queryDate: q.createdAt,
        omniscoreAtQuery: q.omniscoresServed ? 
          (q.omniscoresServed as Record<string, { pos: number }>)[symbol]?.pos : undefined,
      }))
    ),
    userPreferences: {
      morningDigestEnabled: preferences?.morningDigestEnabled ?? false,
      regimeAlertsEnabled: preferences?.regimeAlertsEnabled ?? true,
      typicalSessionTime: preferences?.typicalSessionTime ?? undefined,
      maxPushPerDay: preferences?.maxPushPerDay ?? GUARDRAILS.MAX_PUSH_PER_DAY,
    },
    sessionHistory: {
      lastSessionDate: lifecycle?.lastSessionDate ?? undefined,
      currentStreak: lifecycle?.currentStreak ?? 0,
    },
    todayPushCount: todayNotifications,
  };
}

// =============================================================================
// TRIGGER EVALUATORS
// =============================================================================

/**
 * 1. REGIME SHIFT DETECTION
 * Triggered when market regime changes (Bull→Sideways, Risk-On→Risk-Off)
 */
async function evaluateRegimeShift(context: TriggerContext): Promise<RegimeShiftTrigger[]> {
  if (!context.userPreferences.regimeAlertsEnabled) return [];
  if (context.watchlist.length === 0) return [];
  
  try {
    // Get current and previous regime
    const [currentRegime, lastRegimeAlert] = await Promise.all([
      prismaRetention.marketRegimeState.findFirst({
        where: { isActive: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prismaRetention.notificationDelivery.findFirst({
        where: {
          userId: context.userId,
          notificationType: 'regime_shift',
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    
    if (!currentRegime || !currentRegime.previousRegime) return [];
    if (currentRegime.regime === currentRegime.previousRegime) return [];
    
    // Check cooldown (6 hours)
    if (lastRegimeAlert) {
      const hoursSinceLastAlert = (Date.now() - lastRegimeAlert.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastAlert < TRIGGER_CONFIGS.regime_shift.maxFrequencyHours) {
        return [];
      }
    }
    
    // Find affected watchlist coins
    const watchlistSymbols = context.watchlist.map(w => w.symbol);
    
    const summary = buildRegimeSummary(currentRegime.previousRegime, currentRegime.regime);
    
    return [{
      id: `regime_shift_${Date.now()}`,
      type: 'regime_shift',
      userId: context.userId,
      title: `Market shifted to ${formatRegime(currentRegime.regime)}`,
      body: `${watchlistSymbols.length} of your watched coins affected. ${summary}`,
      channel: 'push',
      priority: 'high',
      signalStrength: 0.9,
      relevanceScore: 0.85,
      metadata: {
        previousRegime: currentRegime.previousRegime,
        newRegime: currentRegime.regime,
        affectedWatchlistCoins: watchlistSymbols,
        fearGreedIndex: currentRegime.fearGreedIndex ?? 50,
        summary,
      },
      createdAt: new Date(),
    }];
  } catch (error) {
    logger.debug('Regime shift evaluation error', { error });
    return [];
  }
}

/**
 * 2. WATCHLIST THRESHOLD ALERTS
 * Price crosses user-defined levels OR OmniScore tier changes
 */
async function evaluateWatchlistThresholds(context: TriggerContext): Promise<WatchlistThresholdTrigger[]> {
  const triggers: WatchlistThresholdTrigger[] = [];
  
  try {
    // Get active alerts for this user
    const alerts = await prismaRetention.retentionAlert.findMany({
      where: {
        userId: context.userId,
        isActive: true,
        alertType: { in: ['price_threshold', 'omniscore_change'] },
      },
    });
    
    if (alerts.length === 0) return [];
    
    // Get current coin states
    const symbols = alerts.filter(a => a.symbol).map(a => a.symbol!);
    const coinStates = await prismaRetention.coinStateSnapshot.findMany({
      where: {
        symbol: { in: symbols },
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['symbol'],
    });
    
    const coinStateMap = new Map(coinStates.map(c => [c.symbol, c]));
    
    for (const alert of alerts) {
      if (!alert.symbol) continue;
      
      const coinState = coinStateMap.get(alert.symbol) as any;
      if (!coinState) continue;
      
      // Check cooldown
      if (alert.lastTriggeredAt) {
        const hoursSinceTrigger = (Date.now() - alert.lastTriggeredAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceTrigger < alert.minIntervalHours) continue;
      }
      
      let triggered = false;
      let whatChanged = '';
      let delta = 0;
      let threshold = 0;
      let currentValue = 0;
      
      // Check price thresholds
      if (alert.alertType === 'price_threshold') {
        if (alert.priceAbove && coinState.price >= alert.priceAbove) {
          triggered = true;
          whatChanged = `crossed $${alert.priceAbove.toFixed(2)} ↑`;
          threshold = alert.priceAbove;
          currentValue = coinState.price;
          delta = ((coinState.price - alert.priceAbove) / alert.priceAbove) * 100;
        } else if (alert.priceBelow && coinState.price <= alert.priceBelow) {
          triggered = true;
          whatChanged = `dropped to $${coinState.price.toFixed(2)} ↓`;
          threshold = alert.priceBelow;
          currentValue = coinState.price;
          delta = ((coinState.price - alert.priceBelow) / alert.priceBelow) * 100;
        }
      }
      
      // Check OmniScore changes
      if (alert.alertType === 'omniscore_change' && alert.omniscoreDelta) {
        const watchlistItem = context.watchlist.find(w => w.symbol === alert.symbol);
        if (watchlistItem?.omniscoreAtAdd) {
          const scoreDelta = coinState.pos - watchlistItem.omniscoreAtAdd;
          if (Math.abs(scoreDelta) >= alert.omniscoreDelta) {
            triggered = true;
            const direction = scoreDelta > 0 ? 'improved' : 'dropped';
            whatChanged = `OmniScore ${direction} ${Math.abs(scoreDelta).toFixed(0)} points`;
            threshold = alert.omniscoreDelta;
            currentValue = coinState.pos;
            delta = scoreDelta;
          }
        }
      }
      
      if (triggered) {
        triggers.push({
          id: `watchlist_threshold_${alert.id}_${Date.now()}`,
          type: 'watchlist_threshold',
          userId: context.userId,
          symbol: alert.symbol,
          title: `${alert.symbol} ${whatChanged}`,
          body: `Now at $${coinState.price.toFixed(2)} (${coinState.price24hChange! >= 0 ? '+' : ''}${coinState.price24hChange?.toFixed(1)}% today)`,
          channel: 'push',
          priority: 'high',
          signalStrength: 0.95,
          relevanceScore: 0.9,
          metadata: {
            alertType: alert.alertType === 'price_threshold' ? 'price' : 'omniscore_change',
            threshold,
            currentValue,
            delta,
            whatChanged,
          },
          createdAt: new Date(),
        });
        
        // Mark alert as triggered
        await prismaRetention.retentionAlert.update({
          where: { id: alert.id },
          data: {
            lastTriggeredAt: new Date(),
            triggerCount: { increment: 1 },
          },
        });
      }
    }
    
    return triggers;
  } catch (error) {
    logger.debug('Watchlist threshold evaluation error', { error });
    return triggers;
  }
}

/**
 * 3. MORNING INTELLIGENCE DIGEST
 * Delivered 30min before user's typical first-session time
 */
async function evaluateMorningDigest(context: TriggerContext): Promise<MorningDigestTrigger[]> {
  if (!context.userPreferences.morningDigestEnabled) return [];
  if (context.watchlist.length === 0) return [];
  
  try {
    // Check if it's the right time (30min before typical session)
    const now = new Date();
    const userLocalHour = now.getHours(); // Simplified: assume UTC for now
    
    // Default: 6-9am
    const isDigestWindow = userLocalHour >= 6 && userLocalHour < 9;
    if (!isDigestWindow) return [];
    
    // Check if already sent today
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const existingDigest = await prismaRetention.notificationDelivery.findFirst({
      where: {
        userId: context.userId,
        notificationType: 'morning_digest',
        createdAt: { gte: todayStart },
      },
    });
    
    if (existingDigest) return [];
    
    // Get overnight moves for watchlist
    const watchlistSymbols = context.watchlist.map(w => w.symbol);
    const coinStates = await prismaRetention.coinStateSnapshot.findMany({
      where: {
        symbol: { in: watchlistSymbols },
      },
      orderBy: { createdAt: 'desc' },
      distinct: ['symbol'],
    });
    
    // Calculate moves
    const moves = coinStates.map(coin => ({
      symbol: coin.symbol,
      change: coin.price24hChange ?? 0,
      direction: (coin.price24hChange ?? 0) > 0.5 ? 'up' as const : 
                 (coin.price24hChange ?? 0) < -0.5 ? 'down' as const : 'flat' as const,
    }));
    
    // Check if market was flat (skip condition)
    const maxMove = Math.max(...moves.map(m => Math.abs(m.change)));
    if (maxMove < 2) {
      return [{
        id: `morning_digest_${Date.now()}`,
        type: 'morning_digest',
        userId: context.userId,
        title: 'Good morning',
        body: 'Market was quiet overnight—no major moves on your watchlist',
        channel: 'push',
        priority: 'low',
        signalStrength: 0.3,
        relevanceScore: 0.3,
        metadata: {
          overnightMoves: moves,
          regimeInsight: 'Market stable',
          skipped: true,
          skipReason: 'Market flat (<2% moves)',
        },
        createdAt: new Date(),
      }];
    }
    
    // Get regime insight
    const regime = await prismaRetention.marketRegimeState.findFirst({
      where: { isActive: true },
    });
    
    const regimeInsight = regime ? 
      `Market is ${formatRegime(regime.regime)}. Fear & Greed: ${regime.fearGreedIndex ?? 'N/A'}` :
      'Market conditions stable';
    
    // Find spotlight coin (biggest positive mover)
    const spotlight = coinStates
      .filter(c => (c.price24hChange ?? 0) > 0)
      .sort((a, b) => (b.price24hChange ?? 0) - (a.price24hChange ?? 0))[0];
    
    // Build summary
    const upCount = moves.filter(m => m.direction === 'up').length;
    const downCount = moves.filter(m => m.direction === 'down').length;
    const summaryText = upCount > downCount ? 
      `${upCount} coins up, ${downCount} down 🟢` :
      `${downCount} coins down, ${upCount} up 🔴`;
    
    return [{
      id: `morning_digest_${Date.now()}`,
      type: 'morning_digest',
      userId: context.userId,
      title: `Good morning. ${summaryText}`,
      body: spotlight ? 
        `Biggest mover: ${spotlight.symbol} +${spotlight.price24hChange?.toFixed(1)}%` :
        regimeInsight,
      channel: 'push',
      priority: 'medium',
      signalStrength: 0.7,
      relevanceScore: 0.8,
      metadata: {
        overnightMoves: moves,
        regimeInsight,
        omniscoreSpotlight: spotlight ? {
          symbol: spotlight.symbol,
          change: spotlight.price24hChange ?? 0,
          reason: 'Top performer overnight',
        } : undefined,
        skipped: false,
      },
      createdAt: new Date(),
    }];
  } catch (error) {
    logger.debug('Morning digest evaluation error', { error });
    return [];
  }
}

/**
 * 4. OPPORTUNITY MOMENTS
 * When watched coin enters Builder/Target quadrant after being in Avoid
 * Max 1 per day; only for coins with ≥3 prior user queries
 */
async function evaluateOpportunityMoments(context: TriggerContext): Promise<OpportunityMomentTrigger[]> {
  if (context.watchlist.length === 0) return [];
  
  try {
    // Check if already sent today
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    const existingOpportunity = await prismaRetention.notificationDelivery.findFirst({
      where: {
        userId: context.userId,
        notificationType: 'opportunity_moment',
        createdAt: { gte: todayStart },
      },
    });
    
    if (existingOpportunity) return [];
    
    // Get coins with quadrant transitions
    const watchlistSymbols = context.watchlist.map(w => w.symbol);
    const transitions = await prismaRetention.coinStateSnapshot.findMany({
      where: {
        symbol: { in: watchlistSymbols },
        previousQuadrant: 'avoid',
        quadrant: { in: ['builder', 'target'] },
        quadrantChangedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    
    if (transitions.length === 0) return [];
    
    // Filter by query history (≥3 queries)
    const symbolQueryCounts = new Map<string, number>();
    for (const query of context.recentQueries) {
      symbolQueryCounts.set(query.symbol, (symbolQueryCounts.get(query.symbol) ?? 0) + 1);
    }
    
    const qualifiedTransitions = transitions.filter(t => 
      (symbolQueryCounts.get(t.symbol) ?? 0) >= 3
    );
    
    if (qualifiedTransitions.length === 0) return [];
    
    // Pick the best opportunity
    const best = qualifiedTransitions.sort((a, b) => b.qs - a.qs)[0];
    
    return [{
      id: `opportunity_${best.symbol}_${Date.now()}`,
      type: 'opportunity_moment',
      userId: context.userId,
      symbol: best.symbol,
      title: `${best.symbol} moved to ${formatQuadrant(best.quadrant)}`,
      body: `QS ${best.qs.toFixed(0)}, OS ${best.os.toFixed(0)}—fundamentals improved while hype cooled`,
      channel: 'in_app',
      priority: 'medium',
      signalStrength: 0.85,
      relevanceScore: 0.9,
      metadata: {
        opportunityType: 'quadrant_transition',
        previousQuadrant: best.previousQuadrant ?? 'avoid',
        currentQuadrant: best.quadrant,
        priorQueries: symbolQueryCounts.get(best.symbol) ?? 0,
        signalDescription: `Moved from Avoid to ${formatQuadrant(best.quadrant)}—strong fundamentals, low hype`,
      },
      createdAt: new Date(),
    }];
  } catch (error) {
    logger.debug('Opportunity moment evaluation error', { error });
    return [];
  }
}

/**
 * 5. CONVERSATIONAL MEMORY TRIGGER
 * "You asked about [coin] 3 days ago—here's what changed"
 * Only if OmniScore delta ≥10pts and user hasn't checked in 48h
 */
async function evaluateConversationMemory(context: TriggerContext): Promise<ConversationMemoryTrigger[]> {
  const triggers: ConversationMemoryTrigger[] = [];
  
  try {
    // Get queries from 2-7 days ago that need follow-up
    const queriesNeedingFollowUp = await prismaRetention.userQuery.findMany({
      where: {
        userId: context.userId,
        requiresFollowUp: true,
        followUpSentAt: null,
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          lte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    
    if (queriesNeedingFollowUp.length === 0) return [];
    
    // Check each query for significant OmniScore change
    for (const query of queriesNeedingFollowUp) {
      if (query.symbols.length === 0) continue;
      
      const symbol = query.symbols[0];
      const originalOmniscore = query.omniscoresServed ? 
        (query.omniscoresServed as Record<string, { pos: number }>)[symbol]?.pos : null;
      
      if (!originalOmniscore) continue;
      
      // Get current OmniScore
      const currentState = await prismaRetention.coinStateSnapshot.findFirst({
        where: { symbol },
        orderBy: { createdAt: 'desc' },
      });
      
      if (!currentState) continue;
      
      const delta = currentState.pos - originalOmniscore;
      
      // Only trigger if delta ≥10
      if (Math.abs(delta) < 10) continue;
      
      // Check if user hasn't checked this coin in 48h
      const recentCheck = context.recentQueries.find(q => 
        q.symbol === symbol && 
        (Date.now() - q.queryDate.getTime()) < 48 * 60 * 60 * 1000
      );
      
      if (recentCheck) continue;
      
      const daysSince = Math.floor((Date.now() - query.createdAt.getTime()) / (24 * 60 * 60 * 1000));
      const direction = delta > 0 ? 'improved' : 'dropped';
      const whatChanged = delta > 0 ? 
        `Quality metrics strengthened (+${delta.toFixed(0)} points)` :
        `Risk signals appeared (${delta.toFixed(0)} points)`;
      
      triggers.push({
        id: `conversation_memory_${query.id}_${Date.now()}`,
        type: 'conversation_memory',
        userId: context.userId,
        symbol,
        title: `Update on ${symbol}`,
        body: `You asked about it ${daysSince} days ago. OmniScore ${direction} to ${currentState.pos.toFixed(0)}`,
        channel: 'in_app',
        priority: 'medium',
        signalStrength: 0.75,
        relevanceScore: 0.85,
        metadata: {
          originalQuery: query.query.substring(0, 100),
          originalQueryDate: query.createdAt,
          omniscoreDelta: delta,
          previousOmniscore: originalOmniscore,
          currentOmniscore: currentState.pos,
          whatChanged,
          daysSinceQuery: daysSince,
        },
        createdAt: new Date(),
      });
      
      // Mark follow-up as sent
      await prismaRetention.userQuery.update({
        where: { id: query.id },
        data: { followUpSentAt: new Date(), followUpType: 'conversation_memory' },
      });
      
      break; // Only one per evaluation
    }
    
    return triggers;
  } catch (error) {
    logger.debug('Conversation memory evaluation error', { error });
    return triggers;
  }
}

/**
 * 6. SOCIAL PROOF (TRIBE TRIGGER)
 * "45 Coinet users added [coin] to watchlists today"
 * Only for unusual spikes (≥3x normal) + coin in user's search history
 * In-app only, never push
 */
async function evaluateSocialProof(context: TriggerContext): Promise<SocialProofTrigger[]> {
  try {
    // Get coins with unusual watchlist activity
    const today = new Date(new Date().setHours(0, 0, 0, 0));
    const coinStats = await prismaRetention.coinStateSnapshot.findMany({
      where: {
        createdAt: { gte: today },
        watchlistAdds24h: { gte: 30 },  // Minimum threshold
      },
      orderBy: { watchlistAdds24h: 'desc' },
      take: 10,
    });
    
    if (coinStats.length === 0) return [];
    
    // Filter by user's search history
    const userSearchedSymbols = new Set(context.recentQueries.map(q => q.symbol));
    
    const relevant = coinStats.filter(c => 
      userSearchedSymbols.has(c.symbol) &&
      c.watchlistAdds24h >= 30  // Assume normal is ~10, so 3x = 30
    );
    
    if (relevant.length === 0) return [];
    
    const best = relevant[0];
    const normalAdds = 10; // Baseline assumption
    const multiplier = Math.round(best.watchlistAdds24h / normalAdds);
    
    return [{
      id: `social_proof_${best.symbol}_${Date.now()}`,
      type: 'social_proof',
      userId: context.userId,
      symbol: best.symbol,
      title: `Trending: ${best.symbol}`,
      body: `${best.watchlistAdds24h} Coinet users added it to watchlists today`,
      channel: 'in_app',  // Never push
      priority: 'low',
      signalStrength: 0.5,
      relevanceScore: 0.7,
      metadata: {
        watchlistAdds: best.watchlistAdds24h,
        normalDailyAdds: normalAdds,
        multiplier,
        userSearchedBefore: true,
      },
      createdAt: new Date(),
    }];
  } catch (error) {
    logger.debug('Social proof evaluation error', { error });
    return [];
  }
}

/**
 * 7. HABIT REINFORCEMENT
 * After 7-day streak: gentle reminder at typical check-in time if user hasn't opened
 * Copy: "[Your watchlist] hasn't checked itself yet today 👀"
 */
async function evaluateHabitReinforcement(context: TriggerContext): Promise<HabitReinforcementTrigger[]> {
  // Only for users with 7+ day streak
  if (context.sessionHistory.currentStreak < 7) return [];
  if (context.watchlist.length === 0) return [];
  
  try {
    // Check if user has already had a session today
    const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
    
    if (context.sessionHistory.lastSessionDate && 
        context.sessionHistory.lastSessionDate >= todayStart) {
      return []; // Already checked in today
    }
    
    // Check if it's past typical check-in time
    const now = new Date();
    const currentHour = now.getHours();
    
    // Default typical time is 8-10am
    const typicalHour = context.userPreferences.typicalSessionTime ? 
      parseInt(context.userPreferences.typicalSessionTime.split(':')[0]) : 9;
    
    // Only trigger if we're past typical time
    if (currentHour < typicalHour) return [];
    
    // Check if already sent today
    const existingReminder = await prismaRetention.notificationDelivery.findFirst({
      where: {
        userId: context.userId,
        notificationType: 'habit_reinforcement',
        createdAt: { gte: todayStart },
      },
    });
    
    if (existingReminder) return [];
    
    const hoursSinceLastSession = context.sessionHistory.lastSessionDate ?
      (Date.now() - context.sessionHistory.lastSessionDate.getTime()) / (1000 * 60 * 60) : 24;
    
    return [{
      id: `habit_reinforcement_${Date.now()}`,
      type: 'habit_reinforcement',
      userId: context.userId,
      title: `Your watchlist hasn't checked itself yet today 👀`,
      body: `${context.watchlist.length} coins waiting. Keep your ${context.sessionHistory.currentStreak}-day streak going!`,
      channel: 'push',
      priority: 'low',
      signalStrength: 0.6,
      relevanceScore: 0.65,
      metadata: {
        currentStreak: context.sessionHistory.currentStreak,
        typicalCheckInTime: context.userPreferences.typicalSessionTime ?? '09:00',
        hoursSinceLastSession,
      },
      createdAt: new Date(),
    }];
  } catch (error) {
    logger.debug('Habit reinforcement evaluation error', { error });
    return [];
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatRegime(regime: string): string {
  const formats: Record<string, string> = {
    risk_on: 'Risk-On',
    risk_off: 'Risk-Off',
    sideways: 'Sideways',
    bull: 'Bullish',
    bear: 'Bearish',
    crash: 'Crisis Mode',
  };
  return formats[regime] ?? regime;
}

function formatQuadrant(quadrant: string): string {
  const formats: Record<string, string> = {
    builder: 'Builder Zone',
    target: 'Target Zone',
    avoid: 'Avoid Zone',
    moon_or_doom: 'Moon or Doom',
  };
  return formats[quadrant] ?? quadrant;
}

function buildRegimeSummary(previous: string, current: string): string {
  if (current === 'risk_off') {
    return 'Defensive positioning may be prudent.';
  }
  if (current === 'risk_on') {
    return 'Market showing renewed confidence.';
  }
  if (current === 'crash') {
    return 'Elevated volatility—stay informed.';
  }
  return `Shifted from ${formatRegime(previous)} to ${formatRegime(current)}.`;
}

// =============================================================================
// EXPORTS
// =============================================================================

export const triggerSystem = {
  evaluate: evaluateTriggers,
  configs: TRIGGER_CONFIGS,
};

export default triggerSystem;
