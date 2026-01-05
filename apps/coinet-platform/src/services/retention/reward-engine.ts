/**
 * 🎁 COINET RETENTION REWARD ENGINE
 * 
 * Stage 3 of the Retention Loop: Variable Rewards
 * Deliver unpredictable-yet-relevant insights that feel like discovering alpha
 * 
 * Three Reward Categories:
 * A) TRIBE REWARDS - Social validation (in-app only, never push)
 * B) HUNT REWARDS - Alpha discovery (high signal, data-backed)
 * C) SELF REWARDS - Mastery validation (reflective, not promotional)
 * 
 * Quality Standards:
 * - All rewards must have signal strength ≥0.3
 * - All rewards tied to user's actual watchlist/queries
 * - Never use "act now" or time pressure language
 * - Anti-spam: Per-reward type throttling
 * 
 * @module retention/reward-engine
 * @version 1.0.0
 */

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { prismaRetention } from './prisma-retention';
import {
  RewardCategory,
  RewardType,
  TribeRewardType,
  HuntRewardType,
  SelfRewardType,
  RewardConfig,
  Reward,
  TribeReward,
  HuntReward,
  SelfReward,
  RewardSurface,
  GUARDRAILS,
} from './types';

// =============================================================================
// CONFIGURATION
// =============================================================================

const REWARD_CONFIGS: Record<RewardType, RewardConfig> = {
  // Tribe Rewards
  consensus_divergence: {
    type: 'consensus_divergence',
    category: 'tribe',
    maxPerWeek: 1,
    requiresWatchlist: true,
    minSignalStrength: 0.5,
    surfaceTypes: ['in_app_banner', 'chat_footer'],
    neverPush: true,
  },
  early_adopter: {
    type: 'early_adopter',
    category: 'tribe',
    maxPerWeek: 2,
    requiresWatchlist: true,
    minSignalStrength: 0.6,
    surfaceTypes: ['in_app_card'],
    neverPush: true,
  },
  watchlist_overlap: {
    type: 'watchlist_overlap',
    category: 'tribe',
    maxPerWeek: 1,
    requiresWatchlist: true,
    minSignalStrength: 0.4,
    surfaceTypes: ['in_app_banner'],
    neverPush: true,
  },
  influencer_divergence: {
    type: 'influencer_divergence',
    category: 'tribe',
    maxPerWeek: 2,
    requiresWatchlist: true,
    minSignalStrength: 0.6,
    surfaceTypes: ['in_app_banner', 'chat_footer'],
    neverPush: true,
  },
  community_discovery: {
    type: 'community_discovery',
    category: 'tribe',
    maxPerWeek: 3,
    requiresWatchlist: false,
    minSignalStrength: 0.3,
    surfaceTypes: ['chat_footer'],
    neverPush: true,
  },
  
  // Hunt Rewards
  quadrant_transition: {
    type: 'quadrant_transition',
    category: 'hunt',
    maxPerWeek: 7,
    maxPerDay: 1,
    requiresWatchlist: true,
    minSignalStrength: 0.7,
    surfaceTypes: ['in_app_card', 'in_app_banner'],
    neverPush: false,
  },
  regime_aligned_opportunity: {
    type: 'regime_aligned_opportunity',
    category: 'hunt',
    maxPerWeek: 2,
    requiresWatchlist: true,
    minSignalStrength: 0.65,
    surfaceTypes: ['in_app_card'],
    neverPush: false,
  },
  hidden_gem: {
    type: 'hidden_gem',
    category: 'hunt',
    maxPerWeek: 7,
    maxPerDay: 1,
    requiresWatchlist: false,
    requiresQueryHistory: true,
    minSignalStrength: 0.6,
    surfaceTypes: ['in_app_card'],
    neverPush: false,
  },
  derivatives_edge: {
    type: 'derivatives_edge',
    category: 'hunt',
    maxPerWeek: 3,
    requiresWatchlist: true,
    minSignalStrength: 0.75,
    surfaceTypes: ['in_app_banner', 'in_app_card'],
    neverPush: false,
  },
  confluence_moment: {
    type: 'confluence_moment',
    category: 'hunt',
    maxPerWeek: 1,  // Rare by design
    requiresWatchlist: true,
    minSignalStrength: 0.85,
    surfaceTypes: ['in_app_card'],
    neverPush: false,
  },
  
  // Self Rewards
  decision_validation: {
    type: 'decision_validation',
    category: 'self',
    maxPerWeek: 3,
    requiresWatchlist: false,
    requiresQueryHistory: true,
    minSignalStrength: 0.5,
    surfaceTypes: ['in_app_card', 'chat_footer'],
    neverPush: false,
  },
  learning_milestone: {
    type: 'learning_milestone',
    category: 'self',
    maxPerWeek: 1,
    requiresWatchlist: false,
    minSignalStrength: 0.4,
    surfaceTypes: ['in_app_card'],
    neverPush: false,
  },
  prediction_accuracy: {
    type: 'prediction_accuracy',
    category: 'self',
    maxPerWeek: 1,  // Monthly summary
    requiresWatchlist: false,
    minSignalStrength: 0.4,
    surfaceTypes: ['in_app_card'],
    neverPush: false,
  },
  portfolio_insight: {
    type: 'portfolio_insight',
    category: 'self',
    maxPerWeek: 1,
    requiresWatchlist: true,
    minSignalStrength: 0.5,
    surfaceTypes: ['in_app_card'],
    neverPush: false,
  },
  complexity_unlocked: {
    type: 'complexity_unlocked',
    category: 'self',
    maxPerWeek: 3,
    requiresWatchlist: false,
    minSignalStrength: 0.4,
    surfaceTypes: ['chat_footer'],
    neverPush: false,
  },
};

// =============================================================================
// REWARD CONTEXT
// =============================================================================

interface RewardContext {
  userId: string;
  watchlist: Array<{
    symbol: string;
    addedAt: Date;
    omniscoreAtAdd?: number;
    qsAtAdd?: number;
    osAtAdd?: number;
    priceAtAdd?: number;
  }>;
  queryHistory: Array<{
    symbol: string;
    queryDate: Date;
    intent: string;
    omniscoreAtQuery?: number;
  }>;
  rewardsDeliveredThisWeek: Map<RewardType, number>;
  rewardsDeliveredToday: Map<RewardType, number>;
  lifecycleSegment: string;
}

// =============================================================================
// MAIN REWARD GENERATOR
// =============================================================================

/**
 * Generate all applicable rewards for a user
 */
export async function generateRewards(userId: string): Promise<Reward[]> {
  const startTime = performance.now();
  const rewards: Reward[] = [];
  
  try {
    const context = await buildRewardContext(userId);
    
    // Generate rewards from each category in parallel
    const [tribeRewards, huntRewards, selfRewards] = await Promise.all([
      generateTribeRewards(context),
      generateHuntRewards(context),
      generateSelfRewards(context),
    ]);
    
    rewards.push(...tribeRewards, ...huntRewards, ...selfRewards);
    
    // Filter by signal strength
    const qualifiedRewards = rewards.filter(r => 
      r.signalStrength >= GUARDRAILS.MIN_SIGNAL_STRENGTH
    );
    
    // Store rewards in database
    for (const reward of qualifiedRewards) {
      await storeReward(reward);
    }
    
    const processingTime = performance.now() - startTime;
    logger.debug('🎁 Reward generation complete', {
      userId,
      rewardsGenerated: qualifiedRewards.length,
      tribe: tribeRewards.length,
      hunt: huntRewards.length,
      self: selfRewards.length,
      processingTimeMs: processingTime.toFixed(1),
    });
    
    return qualifiedRewards;
  } catch (error) {
    logger.error('🎁 Reward generation failed', { userId, error });
    return [];
  }
}

/**
 * Get pending rewards for a user (for display)
 */
export async function getPendingRewards(
  userId: string,
  surface?: RewardSurface
): Promise<Reward[]> {
  try {
    const where: Record<string, unknown> = {
      userId,
      isViewed: false,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    };
    
    if (surface) {
      where.surfaceType = surface;
    }
    
    const rewards = await prismaRetention.retentionReward.findMany({
      where,
      orderBy: [
        { signalStrength: 'desc' },
        { createdAt: 'desc' },
      ],
      take: 10,
    });
    
    return rewards.map(mapDbRewardToReward);
  } catch (error) {
    logger.debug('Failed to get pending rewards', { userId, error });
    return [];
  }
}

// =============================================================================
// CONTEXT BUILDER
// =============================================================================

async function buildRewardContext(userId: string): Promise<RewardContext> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
  
  const [watchlist, queries, rewardsThisWeek, rewardsToday, lifecycle] = await Promise.all([
    prisma.userWatchlist.findMany({
      where: { userId, isArchived: false } as any,
      orderBy: { addedAt: 'desc' },
    }).catch(() => []),
    
    prismaRetention.userQuery.findMany({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }).catch(() => []),
    
    prismaRetention.retentionReward.findMany({
      where: { userId, createdAt: { gte: weekAgo } },
    }).catch(() => []),
    
    prismaRetention.retentionReward.findMany({
      where: { userId, createdAt: { gte: todayStart } },
    }).catch(() => []),
    
    prismaRetention.userLifecycleState.findUnique({
      where: { userId },
    }).catch(() => null),
  ]);
  
  // Count rewards by type this week
  const weeklyRewardCounts = new Map<RewardType, number>();
  for (const reward of rewardsThisWeek) {
    const count = weeklyRewardCounts.get(reward.rewardType as RewardType) ?? 0;
    weeklyRewardCounts.set(reward.rewardType as RewardType, count + 1);
  }
  
  // Count rewards by type today
  const dailyRewardCounts = new Map<RewardType, number>();
  for (const reward of rewardsToday) {
    const count = dailyRewardCounts.get(reward.rewardType as RewardType) ?? 0;
    dailyRewardCounts.set(reward.rewardType as RewardType, count + 1);
  }
  
  return {
    userId,
    watchlist: watchlist.map(w => ({
      symbol: w.symbol,
      addedAt: w.addedAt,
      omniscoreAtAdd: w.omniscoreAtAdd ?? undefined,
      qsAtAdd: w.qsAtAdd ?? undefined,
      osAtAdd: w.osAtAdd ?? undefined,
      priceAtAdd: w.priceAtAdd ?? undefined,
    })),
    queryHistory: queries.flatMap(q =>
      q.symbols.map(symbol => ({
        symbol,
        queryDate: q.createdAt,
        intent: q.intent ?? 'unknown',
        omniscoreAtQuery: q.omniscoresServed ?
          (q.omniscoresServed as Record<string, { pos: number }>)[symbol]?.pos : undefined,
      }))
    ),
    rewardsDeliveredThisWeek: weeklyRewardCounts,
    rewardsDeliveredToday: dailyRewardCounts,
    lifecycleSegment: lifecycle?.segment ?? 'new_user',
  };
}

// =============================================================================
// TRIBE REWARDS GENERATOR
// =============================================================================

async function generateTribeRewards(context: RewardContext): Promise<TribeReward[]> {
  const rewards: TribeReward[] = [];
  
  // 1. Consensus Divergence
  if (canGenerateReward(context, 'consensus_divergence')) {
    const divergence = await detectConsensusDivergence(context);
    if (divergence) rewards.push(divergence);
  }
  
  // 2. Early Adopter Badge
  if (canGenerateReward(context, 'early_adopter')) {
    const earlyAdopter = await detectEarlyAdopter(context);
    if (earlyAdopter) rewards.push(earlyAdopter);
  }
  
  // 3. Watchlist Overlap
  if (canGenerateReward(context, 'watchlist_overlap')) {
    const overlap = await detectWatchlistOverlap(context);
    if (overlap) rewards.push(overlap);
  }
  
  // 4. Influencer Divergence
  if (canGenerateReward(context, 'influencer_divergence')) {
    const influencer = await detectInfluencerDivergence(context);
    if (influencer) rewards.push(influencer);
  }
  
  // 5. Community Discovery
  if (canGenerateReward(context, 'community_discovery')) {
    const community = await detectCommunityDiscovery(context);
    if (community) rewards.push(community);
  }
  
  return rewards;
}

async function detectConsensusDivergence(context: RewardContext): Promise<TribeReward | null> {
  if (context.watchlist.length === 0) return null;
  
  try {
    // Find coins where social sentiment diverges from OmniScore
    const watchlistSymbols = context.watchlist.map(w => w.symbol);
    const coinStates = await prismaRetention.coinStateSnapshot.findMany({
      where: { symbol: { in: watchlistSymbols } },
      orderBy: { createdAt: 'desc' },
      distinct: ['symbol'],
    });
    
    // Look for high OS (hyped) but declining QS
    for (const coin of coinStates) {
      const watchlistItem = context.watchlist.find(w => w.symbol === coin.symbol);
      if (!watchlistItem?.qsAtAdd) continue;
      
      const qsChange = coin.qs - watchlistItem.qsAtAdd;
      
      // High OS (>60) but QS declining (>10pt drop)
      if (coin.os > 60 && qsChange < -10) {
        return {
          id: `consensus_divergence_${coin.symbol}_${Date.now()}`,
          userId: context.userId,
          category: 'tribe',
          type: 'consensus_divergence',
          icon: '🎯',
          title: 'Early Signal',
          body: `Most traders are bullish on ${coin.symbol}, but OmniScore shows QS declining—you spotted this early`,
          cta: 'See full analysis',
          ctaAction: `/analyze/${coin.symbol}`,
          symbol: coin.symbol,
          signalStrength: 0.7,
          dataQuality: 0.9,
          surfaceType: 'in_app_banner',
          isViewed: false,
          isClicked: false,
          createdAt: new Date(),
          metadata: {
            rewardType: 'consensus_divergence',
            socialSentiment: 'bullish',
            omniscoreSignal: 'declining',
          },
        };
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

async function detectEarlyAdopter(context: RewardContext): Promise<TribeReward | null> {
  if (context.watchlist.length === 0) return null;
  
  try {
    // Find coins where user added early before spike in interest
    for (const item of context.watchlist) {
      const daysSinceAdd = Math.floor((Date.now() - item.addedAt.getTime()) / (24 * 60 * 60 * 1000));
      if (daysSinceAdd < 7) continue; // Need at least 7 days
      
      // Get current watchlist activity
      const coinState = await prismaRetention.coinStateSnapshot.findFirst({
        where: { symbol: item.symbol },
        orderBy: { createdAt: 'desc' },
      });
      
      if (!coinState) continue;
      
      // Check if watchlist adds spiked (assume >50 is significant)
      if (coinState.watchlistAdds24h > 50) {
        // Get historical adds to compare
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const historicalState = await prismaRetention.coinStateSnapshot.findFirst({
          where: {
            symbol: item.symbol,
            createdAt: { lt: weekAgo },
          },
          orderBy: { createdAt: 'desc' },
        });
        
        const baselineAdds = historicalState?.watchlistAdds24h ?? 10;
        const increasePercent = ((coinState.watchlistAdds24h - baselineAdds) / baselineAdds) * 100;
        
        if (increasePercent > 200) { // >3x increase
          return {
            id: `early_adopter_${item.symbol}_${Date.now()}`,
            userId: context.userId,
            category: 'tribe',
            type: 'early_adopter',
            icon: '🎯',
            title: 'Early Signal',
            body: `You added ${item.symbol} to watchlist ${daysSinceAdd} days ago. It's now trending (+${increasePercent.toFixed(0)}% watchlist adds)`,
            cta: 'See what others are asking',
            ctaAction: `/trending/${item.symbol}`,
            symbol: item.symbol,
            signalStrength: 0.75,
            dataQuality: 0.85,
            surfaceType: 'in_app_card',
            isViewed: false,
            isClicked: false,
            createdAt: new Date(),
            metadata: {
              rewardType: 'early_adopter',
              daysAhead: daysSinceAdd,
              watchlistIncreasePercent: increasePercent,
            },
          };
        }
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

async function detectWatchlistOverlap(context: RewardContext): Promise<TribeReward | null> {
  // Simplified: Would need cohort analysis
  // For now, return null - implement with actual cohort tracking later
  return null;
}

async function detectInfluencerDivergence(context: RewardContext): Promise<TribeReward | null> {
  // Would need CT/social sentiment integration
  // For now, return null - implement with social intelligence integration
  return null;
}

async function detectCommunityDiscovery(context: RewardContext): Promise<TribeReward | null> {
  try {
    // Find most-analyzed coins on platform
    const topAnalyzed = await prismaRetention.coinStateSnapshot.findFirst({
      where: {
        queryCount24h: { gte: 100 },
      },
      orderBy: { queryCount24h: 'desc' },
    });
    
    if (!topAnalyzed) return null;
    
    return {
      id: `community_discovery_${topAnalyzed.symbol}_${Date.now()}`,
      userId: context.userId,
      category: 'tribe',
      type: 'community_discovery',
      icon: '👥',
      title: 'Community Insight',
      body: `Coinet users have analyzed ${topAnalyzed.symbol} ${topAnalyzed.queryCount24h} times this week`,
      cta: 'See the consensus',
      ctaAction: `/analyze/${topAnalyzed.symbol}`,
      symbol: topAnalyzed.symbol,
      signalStrength: 0.4,
      dataQuality: 0.9,
      surfaceType: 'chat_footer',
      isViewed: false,
      isClicked: false,
      createdAt: new Date(),
      metadata: {
        rewardType: 'community_discovery',
        weeklyAnalysisCount: topAnalyzed.queryCount24h,
      },
    };
  } catch {
    return null;
  }
}

// =============================================================================
// HUNT REWARDS GENERATOR
// =============================================================================

async function generateHuntRewards(context: RewardContext): Promise<HuntReward[]> {
  const rewards: HuntReward[] = [];
  
  // 1. Quadrant Transition Catch
  if (canGenerateReward(context, 'quadrant_transition')) {
    const transition = await detectQuadrantTransition(context);
    if (transition) rewards.push(transition);
  }
  
  // 2. Regime-Aligned Opportunity
  if (canGenerateReward(context, 'regime_aligned_opportunity')) {
    const regimeAligned = await detectRegimeAligned(context);
    if (regimeAligned) rewards.push(regimeAligned);
  }
  
  // 3. Hidden Gem Spotlight
  if (canGenerateReward(context, 'hidden_gem')) {
    const hiddenGem = await detectHiddenGem(context);
    if (hiddenGem) rewards.push(hiddenGem);
  }
  
  // 4. Derivatives Edge
  if (canGenerateReward(context, 'derivatives_edge')) {
    const derivativesEdge = await detectDerivativesEdge(context);
    if (derivativesEdge) rewards.push(derivativesEdge);
  }
  
  // 5. Confluence Moment
  if (canGenerateReward(context, 'confluence_moment')) {
    const confluence = await detectConfluenceMoment(context);
    if (confluence) rewards.push(confluence);
  }
  
  return rewards;
}

async function detectQuadrantTransition(context: RewardContext): Promise<HuntReward | null> {
  if (context.watchlist.length === 0) return null;
  
  try {
    const watchlistSymbols = context.watchlist.map(w => w.symbol);
    
    // Find favorable quadrant transitions in last 24h
    const transitions = await prismaRetention.coinStateSnapshot.findMany({
      where: {
        symbol: { in: watchlistSymbols },
        quadrantChangedAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        quadrant: { in: ['builder', 'target'] },
        previousQuadrant: 'avoid',
      },
      orderBy: { qs: 'desc' },
      take: 1,
    });
    
    if (transitions.length === 0) return null;
    
    const coin = transitions[0];
    
    return {
      id: `quadrant_transition_${coin.symbol}_${Date.now()}`,
      userId: context.userId,
      category: 'hunt',
      type: 'quadrant_transition',
      icon: '💎',
      title: 'Builder Opportunity',
      body: `${coin.symbol} entered ${formatQuadrant(coin.quadrant)} (QS ${coin.qs.toFixed(0)}, OS ${coin.os.toFixed(0)})—strong fundamentals, low hype`,
      cta: 'Analyze full OmniScore',
      ctaAction: `/analyze/${coin.symbol}`,
      symbol: coin.symbol,
      signalStrength: 0.85,
      dataQuality: 0.9,
      surfaceType: 'in_app_card',
      isViewed: false,
      isClicked: false,
      createdAt: new Date(),
      metadata: {
        rewardType: 'quadrant_transition',
        previousQuadrant: coin.previousQuadrant ?? 'avoid',
        currentQuadrant: coin.quadrant,
      },
    };
  } catch {
    return null;
  }
}

async function detectRegimeAligned(context: RewardContext): Promise<HuntReward | null> {
  if (context.watchlist.length === 0) return null;
  
  try {
    const regime = await prismaRetention.marketRegimeState.findFirst({
      where: { isActive: true },
    });
    
    if (!regime) return null;
    
    // Find coins showing uncorrelated strength during risk-off
    if (regime.regime === 'risk_off' || regime.regime === 'bear') {
      const watchlistSymbols = context.watchlist.map(w => w.symbol);
      const strongPerformers = await prismaRetention.coinStateSnapshot.findMany({
        where: {
          symbol: { in: watchlistSymbols },
          qs: { gte: 70 },
          price24hChange: { gte: 0 },
        },
        orderBy: { qs: 'desc' },
        take: 1,
      });
      
      if (strongPerformers.length === 0) return null;
      
      const coin = strongPerformers[0];
      
      return {
        id: `regime_aligned_${coin.symbol}_${Date.now()}`,
        userId: context.userId,
        category: 'hunt',
        type: 'regime_aligned_opportunity',
        icon: '🛡️',
        title: 'Uncorrelated Strength',
        body: `Market is ${formatRegime(regime.regime)}, but ${coin.symbol} shows resilience (QS ${coin.qs.toFixed(0)}, +${coin.price24hChange?.toFixed(1)}%)`,
        cta: 'See why',
        ctaAction: `/analyze/${coin.symbol}`,
        symbol: coin.symbol,
        signalStrength: 0.7,
        dataQuality: 0.85,
        surfaceType: 'in_app_card',
        isViewed: false,
        isClicked: false,
        createdAt: new Date(),
        metadata: {
          rewardType: 'regime_aligned_opportunity',
          marketRegime: regime.regime,
          coinBehavior: 'uncorrelated strength',
        },
      };
    }
    
    return null;
  } catch {
    return null;
  }
}

async function detectHiddenGem(context: RewardContext): Promise<HuntReward | null> {
  try {
    // Get user's searched symbols
    const searchedSymbols = [...new Set(context.queryHistory.map(q => q.symbol))];
    if (searchedSymbols.length === 0) return null;
    
    // Find high QS, low OS coins from user's search history
    const hiddenGems = await prismaRetention.coinStateSnapshot.findMany({
      where: {
        symbol: { in: searchedSymbols },
        qs: { gte: 80 },
        os: { lte: 40 },
      },
      orderBy: { qs: 'desc' },
      take: 1,
    });
    
    if (hiddenGems.length === 0) return null;
    
    const coin = hiddenGems[0];
    
    return {
      id: `hidden_gem_${coin.symbol}_${Date.now()}`,
      userId: context.userId,
      category: 'hunt',
      type: 'hidden_gem',
      icon: '💎',
      title: 'Hidden Gem Spotted',
      body: `${coin.symbol} has Elite fundamentals (QS ${coin.qs.toFixed(0)}) but low market attention (OS ${coin.os.toFixed(0)})—Builder Zone`,
      cta: 'Deep dive',
      ctaAction: `/analyze/${coin.symbol}`,
      symbol: coin.symbol,
      signalStrength: 0.8,
      dataQuality: 0.9,
      surfaceType: 'in_app_card',
      isViewed: false,
      isClicked: false,
      createdAt: new Date(),
      metadata: {
        rewardType: 'hidden_gem',
        qs: coin.qs,
        os: coin.os,
      },
    };
  } catch {
    return null;
  }
}

async function detectDerivativesEdge(context: RewardContext): Promise<HuntReward | null> {
  // Would need derivatives data integration
  // For now, return null - implement with derivatives service
  return null;
}

async function detectConfluenceMoment(context: RewardContext): Promise<HuntReward | null> {
  if (context.watchlist.length === 0) return null;
  
  try {
    const watchlistSymbols = context.watchlist.map(w => w.symbol);
    
    // Find coins with multiple aligned signals
    const coinStates = await prismaRetention.coinStateSnapshot.findMany({
      where: { symbol: { in: watchlistSymbols } },
      orderBy: { createdAt: 'desc' },
      distinct: ['symbol'],
    });
    
    for (const coin of coinStates) {
      const signals: string[] = [];
      
      // Check QS crossed 70
      const watchlistItem = context.watchlist.find(w => w.symbol === coin.symbol);
      if (watchlistItem?.qsAtAdd && watchlistItem.qsAtAdd < 70 && coin.qs >= 70) {
        signals.push('QS crossed 70');
      }
      
      // Check OS rising
      if (watchlistItem?.osAtAdd && coin.os > watchlistItem.osAtAdd + 10) {
        signals.push('OS rising');
      }
      
      // Check quadrant is builder
      if (coin.quadrant === 'builder') {
        signals.push('Builder Zone');
      }
      
      // Need at least 3 signals
      if (signals.length >= 3) {
        return {
          id: `confluence_${coin.symbol}_${Date.now()}`,
          userId: context.userId,
          category: 'hunt',
          type: 'confluence_moment',
          icon: '✨',
          title: 'Confluence Moment',
          body: `3 signals aligned on ${coin.symbol}: ${signals.join(', ')}`,
          cta: 'See full breakdown',
          ctaAction: `/analyze/${coin.symbol}`,
          symbol: coin.symbol,
          signalStrength: 0.95,
          dataQuality: 0.9,
          surfaceType: 'in_app_card',
          isViewed: false,
          isClicked: false,
          createdAt: new Date(),
          metadata: {
            rewardType: 'confluence_moment',
            alignedSignals: signals,
          },
        };
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

// =============================================================================
// SELF REWARDS GENERATOR
// =============================================================================

async function generateSelfRewards(context: RewardContext): Promise<SelfReward[]> {
  const rewards: SelfReward[] = [];
  
  // 1. Decision Validation
  if (canGenerateReward(context, 'decision_validation')) {
    const validation = await detectDecisionValidation(context);
    if (validation) rewards.push(validation);
  }
  
  // 2. Learning Milestone
  if (canGenerateReward(context, 'learning_milestone')) {
    const milestone = await detectLearningMilestone(context);
    if (milestone) rewards.push(milestone);
  }
  
  // 3. Prediction Accuracy (monthly)
  if (canGenerateReward(context, 'prediction_accuracy')) {
    const accuracy = await detectPredictionAccuracy(context);
    if (accuracy) rewards.push(accuracy);
  }
  
  // 4. Portfolio Insight
  if (canGenerateReward(context, 'portfolio_insight')) {
    const insight = await detectPortfolioInsight(context);
    if (insight) rewards.push(insight);
  }
  
  return rewards;
}

async function detectDecisionValidation(context: RewardContext): Promise<SelfReward | null> {
  try {
    // Find queries from 3-7 days ago with "should I" intent
    const relevantQueries = context.queryHistory.filter(q => {
      const daysSince = Math.floor((Date.now() - q.queryDate.getTime()) / (24 * 60 * 60 * 1000));
      return daysSince >= 3 && daysSince <= 7 && 
             (q.intent === 'decision_help' || q.intent === 'quick_answer');
    });
    
    if (relevantQueries.length === 0) return null;
    
    for (const query of relevantQueries) {
      if (!query.omniscoreAtQuery) continue;
      
      // Get current state
      const currentState = await prismaRetention.coinStateSnapshot.findFirst({
        where: { symbol: query.symbol },
        orderBy: { createdAt: 'desc' },
      });
      
      if (!currentState) continue;
      
      // Check if price moved favorably for positive OmniScore
      const priceChange = currentState.priceAtAdd && query.omniscoreAtQuery >= 60 ?
        ((currentState.price - currentState.priceAtAdd!) / currentState.priceAtAdd!) * 100 : 0;
      
      if (Math.abs(priceChange) >= 10) {
        const daysSince = Math.floor((Date.now() - query.queryDate.getTime()) / (24 * 60 * 60 * 1000));
        const direction = priceChange > 0 ? 'positive' : 'negative';
        const outcome = (priceChange > 0 && query.omniscoreAtQuery >= 60) || 
                        (priceChange < 0 && query.omniscoreAtQuery < 60) ?
                        'aligned' : 'diverged';
        
        if (outcome === 'aligned') {
          return {
            id: `decision_validation_${query.symbol}_${Date.now()}`,
            userId: context.userId,
            category: 'self',
            type: 'decision_validation',
            icon: '📈',
            title: 'Your Call',
            body: `You analyzed ${query.symbol} ${daysSince} days ago when OmniScore was ${query.omniscoreAtQuery.toFixed(0)}. It's ${priceChange > 0 ? 'up' : 'down'} ${Math.abs(priceChange).toFixed(1)}% since`,
            cta: 'See what else is moving',
            ctaAction: '/watchlist',
            symbol: query.symbol,
            signalStrength: 0.6,
            dataQuality: 0.85,
            surfaceType: 'in_app_card',
            isViewed: false,
            isClicked: false,
            createdAt: new Date(),
            metadata: {
              rewardType: 'decision_validation',
              originalQueryDate: query.queryDate,
              priceChangePercent: priceChange,
              direction,
            },
          };
        }
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

async function detectLearningMilestone(context: RewardContext): Promise<SelfReward | null> {
  try {
    // Count queries this week
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const queriesThisWeek = context.queryHistory.filter(q => q.queryDate >= weekAgo).length;
    
    // Milestone at 10, 25, 50, 100 analyses
    const milestones = [10, 25, 50, 100];
    
    for (const milestone of milestones) {
      if (queriesThisWeek >= milestone) {
        // Check if this milestone was already celebrated
        const existingMilestone = await prismaRetention.retentionReward.findFirst({
          where: {
            userId: context.userId,
            rewardType: 'learning_milestone',
            metadata: { path: ['count'], equals: milestone },
            createdAt: { gte: weekAgo },
          },
        });
        
        if (!existingMilestone) {
          return {
            id: `learning_milestone_${milestone}_${Date.now()}`,
            userId: context.userId,
            category: 'self',
            type: 'learning_milestone',
            icon: '🎓',
            title: 'Learning Milestone',
            body: `You've analyzed ${milestone} OmniScores this week—getting the hang of QS vs OS`,
            cta: 'Keep exploring',
            ctaAction: '/explore',
            signalStrength: 0.5,
            dataQuality: 1.0,
            surfaceType: 'in_app_card',
            isViewed: false,
            isClicked: false,
            createdAt: new Date(),
            metadata: {
              rewardType: 'learning_milestone',
              milestoneType: 'weekly_analyses',
              count: milestone,
            },
          };
        }
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

async function detectPredictionAccuracy(context: RewardContext): Promise<SelfReward | null> {
  // Monthly summary - implement with proper tracking
  return null;
}

async function detectPortfolioInsight(context: RewardContext): Promise<SelfReward | null> {
  if (context.watchlist.length < 3) return null;
  
  try {
    const watchlistSymbols = context.watchlist.map(w => w.symbol);
    const coinStates = await prismaRetention.coinStateSnapshot.findMany({
      where: { symbol: { in: watchlistSymbols } },
      orderBy: { createdAt: 'desc' },
      distinct: ['symbol'],
    });
    
    if (coinStates.length < 3) return null;
    
    // Calculate average QS
    const avgQs = coinStates.reduce((sum, c) => sum + c.qs, 0) / coinStates.length;
    
    // Determine tier
    let tier: string;
    if (avgQs >= 75) tier = 'Elite';
    else if (avgQs >= 60) tier = 'Strong';
    else if (avgQs >= 45) tier = 'Average';
    else tier = 'Risky';
    
    // Only show if portfolio is Strong or Elite
    if (avgQs < 60) return null;
    
    return {
      id: `portfolio_insight_${Date.now()}`,
      userId: context.userId,
      category: 'self',
      type: 'portfolio_insight',
      icon: '📊',
      title: 'Portfolio Insight',
      body: `Your watchlist average QS: ${avgQs.toFixed(0)} (${tier} tier)—you're watching quality projects`,
      cta: 'See breakdown',
      ctaAction: '/watchlist/analysis',
      signalStrength: 0.55,
      dataQuality: 0.9,
      surfaceType: 'in_app_card',
      isViewed: false,
      isClicked: false,
      createdAt: new Date(),
      metadata: {
        rewardType: 'portfolio_insight',
        avgQs,
        tier,
      },
    };
  } catch {
    return null;
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function canGenerateReward(context: RewardContext, type: RewardType): boolean {
  const config = REWARD_CONFIGS[type];
  
  // Check weekly limit
  const weeklyCount = context.rewardsDeliveredThisWeek.get(type) ?? 0;
  if (weeklyCount >= config.maxPerWeek) return false;
  
  // Check daily limit if set
  if (config.maxPerDay) {
    const dailyCount = context.rewardsDeliveredToday.get(type) ?? 0;
    if (dailyCount >= config.maxPerDay) return false;
  }
  
  return true;
}

async function storeReward(reward: Reward): Promise<void> {
  try {
    await prismaRetention.retentionReward.create({
      data: {
        id: reward.id,
        userId: reward.userId,
        rewardCategory: reward.category,
        rewardType: reward.type,
        title: reward.title,
        body: reward.body,
        symbol: reward.symbol,
        metadata: reward.metadata,
        signalStrength: reward.signalStrength,
        dataQuality: reward.dataQuality,
        surfaceType: reward.surfaceType,
        expiresAt: reward.expiresAt,
        isViewed: false,
        isClicked: false,
      },
    });
  } catch (error) {
    logger.debug('Failed to store reward', { rewardId: reward.id, error });
  }
}

function mapDbRewardToReward(dbReward: {
  id: string;
  userId: string;
  rewardCategory: string;
  rewardType: string;
  title: string;
  body: string;
  symbol: string | null;
  metadata: unknown;
  signalStrength: number;
  dataQuality: number;
  surfaceType: string;
  isViewed: boolean;
  viewedAt: Date | null;
  isClicked: boolean;
  clickedAt: Date | null;
  createdAt: Date;
  expiresAt: Date | null;
}): Reward {
  return {
    id: dbReward.id,
    userId: dbReward.userId,
    category: dbReward.rewardCategory as RewardCategory,
    type: dbReward.rewardType as RewardType,
    icon: getRewardIcon(dbReward.rewardType as RewardType),
    title: dbReward.title,
    body: dbReward.body,
    cta: 'View',
    ctaAction: dbReward.symbol ? `/analyze/${dbReward.symbol}` : '/dashboard',
    symbol: dbReward.symbol ?? undefined,
    metadata: dbReward.metadata as Record<string, unknown>,
    signalStrength: dbReward.signalStrength,
    dataQuality: dbReward.dataQuality,
    surfaceType: dbReward.surfaceType as RewardSurface,
    isViewed: dbReward.isViewed,
    viewedAt: dbReward.viewedAt ?? undefined,
    isClicked: dbReward.isClicked,
    clickedAt: dbReward.clickedAt ?? undefined,
    createdAt: dbReward.createdAt,
    expiresAt: dbReward.expiresAt ?? undefined,
  };
}

function getRewardIcon(type: RewardType): string {
  const icons: Record<RewardType, string> = {
    consensus_divergence: '🎯',
    early_adopter: '🎯',
    watchlist_overlap: '👥',
    influencer_divergence: '🔍',
    community_discovery: '👥',
    quadrant_transition: '💎',
    regime_aligned_opportunity: '🛡️',
    hidden_gem: '💎',
    derivatives_edge: '📊',
    confluence_moment: '✨',
    decision_validation: '📈',
    learning_milestone: '🎓',
    prediction_accuracy: '🏆',
    portfolio_insight: '📊',
    complexity_unlocked: '🔓',
  };
  return icons[type] ?? '🎁';
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

// =============================================================================
// EXPORTS
// =============================================================================

export const rewardEngine = {
  generate: generateRewards,
  getPending: getPendingRewards,
  configs: REWARD_CONFIGS,
};

export default rewardEngine;
