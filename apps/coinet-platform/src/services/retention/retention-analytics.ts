/**
 * 📊 COINET RETENTION ANALYTICS
 * 
 * Metrics tracking and failure mode detection
 * 
 * North Star Metric:
 * - Weekly Active Sessions (WAU) with ≥1 meaningful interaction
 * 
 * Supporting Metrics:
 * - Daily Habit Formation Rate
 * - Time-to-First-Insight
 * - Watchlist Return Rate
 * - OmniScore Engagement Depth
 * - Alert Response Rate
 * 
 * 90-Day Targets:
 * - D1→W2 retention: 40%
 * - Habit formation: 35% of W2 users
 * - Avg sessions/week: 6.5
 * - Time-to-first-insight: <5sec (p50)
 * - Push notification CTR: >18%
 * 
 * Failure Mode Detection:
 * - Spam notifications
 * - Random rewards
 * - Slow analysis
 * - Stale watchlist
 * - And more...
 * 
 * @module retention/retention-analytics
 * @version 1.0.0
 */

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { prismaRetention } from './prisma-retention';
import {
  RetentionMetrics,
  RETENTION_TARGETS,
  FailureMode,
  FailureModeConfig,
  FailureDetection,
} from './types';

// =============================================================================
// FAILURE MODE CONFIGURATIONS
// =============================================================================

const FAILURE_CONFIGS: FailureModeConfig[] = [
  {
    type: 'spam_notifications',
    description: 'Notifications feel spammy',
    symptoms: ['User disables push', 'Stops opening app after notifications'],
    rootCause: 'Too frequent, low signal-to-noise ratio, or irrelevant triggers',
    fixes: [
      'Hard cap: 2 pushes/day unless user-set alert',
      'Relevance filter: Only notify if >5% price move OR tier change on watchlist',
      'Include insight in notification, not "something happened, check app"',
    ],
    detectionQuery: 'Users who disabled push within 7 days of heavy notifications',
    threshold: 0.1, // >10% of notified users
  },
  {
    type: 'random_rewards',
    description: 'Rewards feel random, not meaningful',
    symptoms: ['User ignores opportunity cards', 'Low reward CTR'],
    rootCause: 'Rewards not tied to user\'s actual interests or are too generic',
    fixes: [
      'Tribe rewards only for coins user has searched/watched',
      'Hunt rewards require ≥2 confirming signals',
      'Self rewards must reference specific user action',
    ],
    detectionQuery: 'Reward CTR below 10% for users with >5 rewards',
    threshold: 0.10,
  },
  {
    type: 'slow_analysis',
    description: 'Analysis takes too long to consume',
    symptoms: ['User opens app, sees wall of text, closes without reading'],
    rootCause: 'Intent classifier defaulting to Deep Analysis for everything',
    fixes: [
      'Tune quick_answer patterns',
      'Add "TL;DR" row at top of every analysis',
      'Use progressive disclosure',
    ],
    detectionQuery: 'Sessions with <10 second duration after analysis query',
    threshold: 0.2, // >20% bounce after analysis
  },
  {
    type: 'stale_watchlist',
    description: 'Watchlist becomes stale',
    symptoms: ['User adds 10 coins, never removes any, stops checking'],
    rootCause: 'No hygiene prompts, watchlist gets cluttered',
    fixes: [
      'Weekly prompt for coins not checked in 14 days',
      'Auto-archive coins with no interaction for 30 days',
      'Max watchlist size: 15 coins',
    ],
    detectionQuery: 'Users with >10 watchlist items and <1 check/week',
    threshold: 0.3,
  },
  {
    type: 'forgotten_context',
    description: 'User can\'t recall why they watchlisted a coin',
    symptoms: ['Opens watchlist, doesn\'t remember rationale'],
    rootCause: 'No context saved at moment of add',
    fixes: [
      'Add optional "notes" field when adding to watchlist',
      'Show "Added [date]" and OmniScore delta since add',
      'Feature: "Review your thesis"',
    ],
    detectionQuery: 'Watchlist items never checked after initial add',
    threshold: 0.4,
  },
  {
    type: 'regime_not_actionable',
    description: 'Regime shifts don\'t feel actionable',
    symptoms: ['User sees "Risk-Off" alert, doesn\'t know what to do'],
    rootCause: 'Regime shift notification is informational, not actionable',
    fixes: [
      'Add "What this means" explainer',
      'Include historically-favored assets',
      'CTA: "Show me my Risk-Off plays"',
    ],
    detectionQuery: 'Regime notifications with <5% click-through',
    threshold: 0.05,
  },
  {
    type: 'digest_ignored',
    description: 'Morning digest becomes ignored',
    symptoms: ['Open rate drops from 60% Week 1 to 15% Week 4'],
    rootCause: 'Content is static or predictable',
    fixes: [
      'Skip digest if market was flat overnight',
      'Rotate format: watchlist, regime, Hidden Gem',
      'Add 1 surprising data point',
    ],
    detectionQuery: 'Digest open rate trend declining >50% over 4 weeks',
    threshold: 0.5,
  },
  {
    type: 'repeated_queries',
    description: 'User asks same question repeatedly',
    symptoms: ['"BTC price" query 5 times per day'],
    rootCause: 'Price widget not prominent enough, or user doesn\'t trust stale data',
    fixes: [
      'Make watchlist widget always-on and always-fresh',
      'Add "Last updated [time]" indicator',
      'Pre-emptive response with freshness info',
    ],
    detectionQuery: 'Users with >3 identical queries per day',
    threshold: 0.1,
  },
  {
    type: 'slow_chat',
    description: 'Chat feels slow or robotic',
    symptoms: ['User switches to Twitter or TradingView'],
    rootCause: 'AI response latency >3sec, or responses are over-formatted',
    fixes: [
      'Intent-optimized responses',
      'Show "thinking..." for <1sec max',
      'Remove filler words, get to data immediately',
    ],
    detectionQuery: 'Average response time >3 seconds',
    threshold: 3.0, // seconds
  },
  {
    type: 'trust_lost',
    description: 'User loses trust after bad call',
    symptoms: ['User bought coin after "should I buy", it dumped, stops using'],
    rootCause: 'User expected guarantee, not probabilistic guidance',
    fixes: [
      'Copy clarity: "Based on data, here\'s the case for/against..."',
      'Never say "buy" directly—say "signals suggest..."',
      'Follow-up: "Market moved against thesis. Here\'s what changed."',
    ],
    detectionQuery: 'Users who churned within 7 days of decision_help query on losing coin',
    threshold: 0.05,
  },
];

// =============================================================================
// METRICS CALCULATION
// =============================================================================

/**
 * Calculate current retention metrics
 */
export async function calculateRetentionMetrics(): Promise<RetentionMetrics> {
  const startTime = performance.now();
  
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    // Weekly Active Users with meaningful interaction
    const wauWithInteraction = await prismaRetention.userSession.groupBy({
      by: ['userId'],
      where: {
        sessionStart: { gte: weekAgo },
        OR: [
          { queriesCount: { gte: 1 } },
          { watchlistChecks: { gte: 1 } },
          { alertsSet: { gte: 1 } },
        ],
      },
    });
    
    // Daily Habit Formation Rate (W2 users with 4+ session days)
    const week2Users = await prismaRetention.userLifecycleState.findMany({
      where: {
        daysSinceSignup: { gte: 7, lte: 21 },
      },
      select: { userId: true },
    });
    
    let habitFormingCount = 0;
    for (const user of week2Users) {
      // Get all sessions and count unique days
      const sessions = await prismaRetention.userSession.findMany({
        where: {
          userId: user.userId,
          sessionStart: { gte: weekAgo },
        },
        select: { sessionStart: true },
      });
      const sessionDays = new Set(
        sessions.map(s => s.sessionStart.toISOString().split('T')[0])
      ).size;
      
      if (sessionDays >= 4) {
        habitFormingCount++;
      }
    }
    
    const dailyHabitFormationRate = week2Users.length > 0 ?
      habitFormingCount / week2Users.length : 0;
    
    // Median Time-to-First-Insight
    const recentSessions = await prismaRetention.userSession.findMany({
      where: {
        sessionStart: { gte: weekAgo },
        durationSeconds: { not: null },
      },
      orderBy: { durationSeconds: 'asc' },
      take: 1000,
    });
    
    const medianTimeToFirstInsight = recentSessions.length > 0 ?
      recentSessions[Math.floor(recentSessions.length / 2)]?.durationSeconds ?? 10 : 10;
    
    // Watchlist Return Rate (within 24h)
    const watchlistSetups = await prisma.userWatchlist.findMany({
      where: {
        addedAt: { gte: twoWeeksAgo, lte: weekAgo },
      },
      select: { userId: true, addedAt: true },
    });
    
    let watchlistReturns = 0;
    for (const setup of watchlistSetups.slice(0, 100)) { // Sample
      const returnSession = await prismaRetention.userSession.findFirst({
        where: {
          userId: setup.userId,
          sessionStart: {
            gte: setup.addedAt,
            lte: new Date(setup.addedAt.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });
      
      if (returnSession) watchlistReturns++;
    }
    
    const watchlistReturnRate = watchlistSetups.length > 0 ?
      watchlistReturns / Math.min(watchlistSetups.length, 100) : 0;
    
    // OmniScore Engagement Depth (users who expand beyond headline)
    const omniscoreQueries = await prismaRetention.userQuery.count({
      where: {
        createdAt: { gte: weekAgo },
        intent: 'deep_analysis',
      },
    });
    
    const totalQueries = await prismaRetention.userQuery.count({
      where: {
        createdAt: { gte: weekAgo },
      },
    });
    
    const omniscoreEngagementDepth = totalQueries > 0 ?
      omniscoreQueries / totalQueries : 0;
    
    // Alert Response Rate
    const alertsSent = await prismaRetention.notificationDelivery.count({
      where: {
        createdAt: { gte: weekAgo },
        notificationType: { in: ['regime_shift', 'watchlist_threshold', 'price_threshold'] },
        status: { in: ['sent', 'delivered', 'opened', 'clicked'] },
      },
    });
    
    const alertsWithSession = await prismaRetention.notificationDelivery.count({
      where: {
        createdAt: { gte: weekAgo },
        notificationType: { in: ['regime_shift', 'watchlist_threshold', 'price_threshold'] },
        clickedAt: { not: null },
      },
    });
    
    const alertResponseRate = alertsSent > 0 ? alertsWithSession / alertsSent : 0;
    
    const processingTime = performance.now() - startTime;
    logger.info('📊 Retention metrics calculated', {
      wau: wauWithInteraction.length,
      habitFormationRate: dailyHabitFormationRate.toFixed(2),
      alertResponseRate: alertResponseRate.toFixed(2),
      processingTimeMs: processingTime.toFixed(1),
    });
    
    return {
      weeklyActiveUsers: wauWithInteraction.length,
      weeklyActiveSessionsWithInteraction: wauWithInteraction.length,
      dailyHabitFormationRate,
      medianTimeToFirstInsight,
      watchlistReturnRate,
      omniscoreEngagementDepth,
      alertResponseRate,
      sampleSize: Math.min(recentSessions.length, 1000),
      dataQuality: 0.9,
      calculatedAt: new Date(),
    };
  } catch (error) {
    logger.error('📊 Retention metrics calculation failed', { error });
    
    return {
      weeklyActiveUsers: 0,
      weeklyActiveSessionsWithInteraction: 0,
      dailyHabitFormationRate: 0,
      medianTimeToFirstInsight: 0,
      watchlistReturnRate: 0,
      omniscoreEngagementDepth: 0,
      alertResponseRate: 0,
      sampleSize: 0,
      dataQuality: 0,
      calculatedAt: new Date(),
    };
  }
}

/**
 * Store daily metrics snapshot
 */
export async function storeDailyMetrics(): Promise<void> {
  const metrics = await calculateRetentionMetrics();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  try {
    // Get segment counts
    const segmentCounts = await prismaRetention.userLifecycleState.groupBy({
      by: ['segment'],
      _count: true,
    });
    
    const segmentMap = new Map(segmentCounts.map(s => [s.segment, s._count]));
    
    // Get notification metrics
    const pushSent = await prismaRetention.notificationDelivery.count({
      where: {
        channel: 'push',
        createdAt: { gte: today },
        status: { in: ['sent', 'delivered'] },
      },
    });
    
    const pushClicked = await prismaRetention.notificationDelivery.count({
      where: {
        channel: 'push',
        createdAt: { gte: today },
        clickedAt: { not: null },
      },
    });
    
    // Get reward metrics
    const rewardCounts = await prismaRetention.retentionReward.groupBy({
      by: ['rewardCategory'],
      where: {
        createdAt: { gte: today },
      },
      _count: true,
    });
    
    const rewardMap = new Map(rewardCounts.map(r => [r.rewardCategory, r._count]));
    
    const rewardClicks = await prismaRetention.retentionReward.count({
      where: {
        createdAt: { gte: today },
        isClicked: true,
      },
    });
    
    const totalRewards = rewardCounts.reduce((sum, r) => sum + r._count, 0);
    
    // Get investment metrics
    const watchlistAdds = await prisma.userWatchlist.count({
      where: {
        addedAt: { gte: today },
      },
    });
    
    const alertsSet = await prismaRetention.retentionAlert.count({
      where: {
        createdAt: { gte: today },
      },
    });
    
    const digestOptIns = await prisma.userPreferences.count({
      where: {
        morningDigestEnabled: true,
        updatedAt: { gte: today },
      } as any,
    });
    
    await prismaRetention.retentionMetricsDaily.upsert({
      where: {
        tenantId_date: {
          tenantId: 'default',
          date: today,
        },
      },
      update: {
        weeklyActiveUsers: metrics.weeklyActiveUsers,
        dailyHabitFormationRate: metrics.dailyHabitFormationRate,
        medianTimeToFirstInsight: metrics.medianTimeToFirstInsight,
        watchlistReturnRate: metrics.watchlistReturnRate,
        omniscoreEngagementDepth: metrics.omniscoreEngagementDepth,
        alertResponseRate: metrics.alertResponseRate,
        d1Retention: 0, // Calculate separately
        d7Retention: 0,
        d30Retention: 0,
        newUserCount: segmentMap.get('new_user') ?? 0,
        earlyUserCount: segmentMap.get('early') ?? 0,
        habitFormingCount: segmentMap.get('habit_forming') ?? 0,
        powerUserCount: segmentMap.get('power_user') ?? 0,
        dormantCount: segmentMap.get('dormant') ?? 0,
        pushNotificationsSent: pushSent,
        pushNotificationsCTR: pushSent > 0 ? pushClicked / pushSent : 0,
        tribeRewardsDelivered: rewardMap.get('tribe') ?? 0,
        huntRewardsDelivered: rewardMap.get('hunt') ?? 0,
        selfRewardsDelivered: rewardMap.get('self') ?? 0,
        rewardCTR: totalRewards > 0 ? rewardClicks / totalRewards : 0,
        watchlistAddsTotal: watchlistAdds,
        alertsSetTotal: alertsSet,
        morningDigestOptIns: digestOptIns,
      },
      create: {
        tenantId: 'default',
        date: today,
        weeklyActiveUsers: metrics.weeklyActiveUsers,
        dailyHabitFormationRate: metrics.dailyHabitFormationRate,
        medianTimeToFirstInsight: metrics.medianTimeToFirstInsight,
        watchlistReturnRate: metrics.watchlistReturnRate,
        omniscoreEngagementDepth: metrics.omniscoreEngagementDepth,
        alertResponseRate: metrics.alertResponseRate,
        d1Retention: 0,
        d7Retention: 0,
        d30Retention: 0,
        newUserCount: segmentMap.get('new_user') ?? 0,
        earlyUserCount: segmentMap.get('early') ?? 0,
        habitFormingCount: segmentMap.get('habit_forming') ?? 0,
        powerUserCount: segmentMap.get('power_user') ?? 0,
        dormantCount: segmentMap.get('dormant') ?? 0,
        pushNotificationsSent: pushSent,
        pushNotificationsCTR: pushSent > 0 ? pushClicked / pushSent : 0,
        tribeRewardsDelivered: rewardMap.get('tribe') ?? 0,
        huntRewardsDelivered: rewardMap.get('hunt') ?? 0,
        selfRewardsDelivered: rewardMap.get('self') ?? 0,
        rewardCTR: totalRewards > 0 ? rewardClicks / totalRewards : 0,
        watchlistAddsTotal: watchlistAdds,
        alertsSetTotal: alertsSet,
        morningDigestOptIns: digestOptIns,
      },
    });
    
    logger.info('📊 Daily metrics stored', { date: today.toISOString().split('T')[0] });
  } catch (error) {
    logger.error('📊 Failed to store daily metrics', { error });
  }
}

// =============================================================================
// FAILURE MODE DETECTION
// =============================================================================

/**
 * Detect active failure modes
 */
export async function detectFailures(userId?: string): Promise<FailureDetection[]> {
  const failures: FailureDetection[] = [];
  
  try {
    for (const config of FAILURE_CONFIGS) {
      const detection = await checkFailureMode(config, userId);
      if (detection) {
        failures.push(detection);
      }
    }
    
    // Store detected failures
    for (const failure of failures) {
      await prismaRetention.retentionFailureEvent.create({
        data: {
          failureType: failure.type,
          severity: failure.severity,
          userId: failure.userId,
          description: failure.description,
          metadata: failure.metadata,
          isResolved: false,
          detectedAt: new Date(),
        },
      });
    }
    
    if (failures.length > 0) {
      logger.warn('📊 Failure modes detected', {
        count: failures.length,
        types: failures.map(f => f.type),
      });
    }
    
    return failures;
  } catch (error) {
    logger.error('📊 Failure detection failed', { error });
    return [];
  }
}

async function checkFailureMode(
  config: FailureModeConfig,
  userId?: string
): Promise<FailureDetection | null> {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  
  switch (config.type) {
    case 'spam_notifications': {
      // Check for users who received many notifications and stopped engaging
      const heavyNotificationUsers = await prismaRetention.notificationDelivery.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: weekAgo },
          channel: 'push',
        },
        _count: true,
        having: {
          userId: { _count: { gte: 10 } },
        },
      });
      
      let disengagedCount = 0;
      for (const user of heavyNotificationUsers.slice(0, 50)) {
        const recentSession = await prismaRetention.userSession.findFirst({
          where: {
            userId: user.userId,
            sessionStart: { gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
          },
        });
        
        if (!recentSession) disengagedCount++;
      }
      
      const rate = heavyNotificationUsers.length > 0 ?
        disengagedCount / heavyNotificationUsers.length : 0;
      
      if (rate > config.threshold) {
        return {
          type: 'spam_notifications',
          severity: rate > 0.2 ? 'critical' : 'warning',
          description: `${(rate * 100).toFixed(1)}% of heavily-notified users disengaged`,
          metadata: { rate, threshold: config.threshold, sampleSize: heavyNotificationUsers.length },
          detectedAt: new Date(),
          isResolved: false,
        };
      }
      break;
    }
    
    case 'random_rewards': {
      // Check reward CTR
      const rewards = await prismaRetention.retentionReward.findMany({
        where: {
          createdAt: { gte: weekAgo },
        },
      });
      
      const clickedRewards = rewards.filter(r => r.isClicked).length;
      const ctr = rewards.length > 0 ? clickedRewards / rewards.length : 0;
      
      if (ctr < config.threshold && rewards.length > 50) {
        return {
          type: 'random_rewards',
          severity: ctr < 0.05 ? 'critical' : 'warning',
          description: `Reward CTR at ${(ctr * 100).toFixed(1)}% (target: ${(config.threshold * 100)}%)`,
          metadata: { ctr, threshold: config.threshold, sampleSize: rewards.length },
          detectedAt: new Date(),
          isResolved: false,
        };
      }
      break;
    }
    
    case 'slow_chat': {
      // Check average response time (would need to track this metric)
      // For now, return null as we need response time tracking
      break;
    }
    
    case 'stale_watchlist': {
      // Check for users with large watchlists but low engagement
      const staleWatchlistUsers = await prisma.$queryRaw<Array<{ userId: string; count: bigint }>>`
        SELECT user_id as "userId", COUNT(*) as count
        FROM user_watchlists
        WHERE is_archived = false
        AND last_checked < NOW() - INTERVAL '14 days'
        GROUP BY user_id
        HAVING COUNT(*) >= 5
      `.catch(() => []);
      
      if (staleWatchlistUsers.length > 10) {
        return {
          type: 'stale_watchlist',
          severity: staleWatchlistUsers.length > 50 ? 'critical' : 'warning',
          description: `${staleWatchlistUsers.length} users have stale watchlists (5+ unchecked coins)`,
          metadata: { affectedUsers: staleWatchlistUsers.length },
          detectedAt: new Date(),
          isResolved: false,
        };
      }
      break;
    }
    
    // Add more failure mode checks as needed
  }
  
  return null;
}

// =============================================================================
// COHORT ANALYSIS
// =============================================================================

/**
 * Calculate retention cohort data
 */
export async function calculateCohortRetention(
  cohortDate: Date,
  days: number[]
): Promise<Record<number, number>> {
  const cohortStart = new Date(cohortDate);
  cohortStart.setHours(0, 0, 0, 0);
  const cohortEnd = new Date(cohortStart);
  cohortEnd.setDate(cohortEnd.getDate() + 1);
  
  // Get users who signed up on cohort date
  const cohortUsers = await (prisma as any).user.findMany({
    where: {
      createdAt: { gte: cohortStart, lt: cohortEnd },
    },
    select: { id: true },
  });
  
  const cohortSize = cohortUsers.length;
  if (cohortSize === 0) return {};
  
  const retention: Record<number, number> = {};
  
  for (const day of days) {
    const dayStart = new Date(cohortStart);
    dayStart.setDate(dayStart.getDate() + day);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    
    // Count users who had a session on this day
    const activeUsers = await prismaRetention.userSession.groupBy({
      by: ['userId'],
      where: {
        userId: { in: cohortUsers.map(u => u.id) },
        sessionStart: { gte: dayStart, lt: dayEnd },
      },
    });
    
    retention[day] = activeUsers.length / cohortSize;
  }
  
  return retention;
}

// =============================================================================
// EXPORTS
// =============================================================================

export const retentionAnalytics = {
  calculate: calculateRetentionMetrics,
  storeDaily: storeDailyMetrics,
  detectFailures,
  calculateCohort: calculateCohortRetention,
  targets: RETENTION_TARGETS,
  failureConfigs: FAILURE_CONFIGS,
};

export default retentionAnalytics;
