/**
 * 👤 COINET LIFECYCLE SEGMENTATION ENGINE
 * 
 * User Lifecycle Management for targeted retention mechanics
 * 
 * Segments:
 * 1. NEW_USER (Day 0-1): First impressions, onboarding
 * 2. EARLY (Day 2-7): Habit formation, trigger learning
 * 3. HABIT_FORMING (Week 2-4): Routine establishment
 * 4. POWER_USER (Month 2+): Deep engagement, advanced features
 * 5. CHURNING: At-risk users (declining engagement)
 * 6. DORMANT: No activity 14+ days
 * 
 * Each segment has:
 * - Job-to-be-done
 * - Loop emphasis (trigger/action/reward/investment)
 * - Next best actions
 * - Notification rules
 * 
 * @module retention/lifecycle-segmentation
 * @version 1.0.0
 */

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { prismaRetention } from './prisma-retention';
import {
  LifecycleSegment,
  LifecycleSegmentConfig,
  UserLifecycleContext,
  NotificationRule,
} from './types';

// =============================================================================
// SEGMENT CONFIGURATIONS
// =============================================================================

const SEGMENT_CONFIGS: Record<LifecycleSegment, LifecycleSegmentConfig> = {
  new_user: {
    segment: 'new_user',
    description: 'First-time users discovering Coinet (Day 0-1)',
    jobToBeDone: 'Understand what Coinet does, get first "aha" moment of useful intelligence',
    loopEmphasis: ['action', 'variable_reward'],
    nextBestActions: [
      'Add 3 coins to watchlist',
      'Ask first OmniScore query',
      'Enable morning digest',
    ],
    notificationRules: [
      {
        id: 'new_user_welcome',
        segment: 'new_user',
        type: 'habit_reinforcement',
        channel: 'push',
        maxPerDay: 1,
        minIntervalHours: 4,
        copyTemplate: 'Quick—try asking: "What\'s Bitcoin\'s OmniScore?"',
        conditions: [
          { field: 'hoursSinceSignup', operator: 'gte', value: 4 },
          { field: 'sessionCount', operator: 'eq', value: 0 },
        ],
      },
      {
        id: 'new_user_first_value',
        segment: 'new_user',
        type: 'watchlist_threshold',
        channel: 'push',
        maxPerDay: 1,
        minIntervalHours: 24,
        copyTemplate: 'Your watchlist moved overnight. {symbol} {change}%. Tap to see OmniScore→',
        conditions: [
          { field: 'watchlistSize', operator: 'gte', value: 1 },
          { field: 'hoursSinceSignup', operator: 'gte', value: 24 },
        ],
      },
    ],
  },
  
  early: {
    segment: 'early',
    description: 'Users discovering value (Day 2-7)',
    jobToBeDone: 'Establish routine of checking Coinet for intelligence, see it as "source of truth"',
    loopEmphasis: ['trigger', 'investment'],
    nextBestActions: [
      'Experience one regime shift notification',
      'Set first price alert',
      'Return after notification',
    ],
    notificationRules: [
      {
        id: 'early_regime_shift',
        segment: 'early',
        type: 'regime_shift',
        channel: 'push',
        maxPerDay: 1,
        minIntervalHours: 6,
        copyTemplate: 'Market just shifted to {regime}—your watchlist affected. Details→',
        conditions: [
          { field: 'regimeAlertsEnabled', operator: 'eq', value: true },
        ],
      },
      {
        id: 'early_reengage',
        segment: 'early',
        type: 'conversation_memory',
        channel: 'push',
        maxPerDay: 1,
        minIntervalHours: 48,
        copyTemplate: '{symbol} moved {change}% since you checked. Worth a look?',
        conditions: [
          { field: 'hoursSinceLastSession', operator: 'gte', value: 48 },
          { field: 'queryCount', operator: 'gte', value: 1 },
        ],
      },
    ],
  },
  
  habit_forming: {
    segment: 'habit_forming',
    description: 'Users building daily habits (Week 2-4)',
    jobToBeDone: 'Make Coinet checking automatic, part of daily routine',
    loopEmphasis: ['trigger', 'variable_reward'],
    nextBestActions: [
      'Hit 7-day streak',
      'Experience Tribe or Hunt reward',
      'Share risk tolerance',
    ],
    notificationRules: [
      {
        id: 'habit_morning_digest',
        segment: 'habit_forming',
        type: 'morning_digest',
        channel: 'push',
        maxPerDay: 1,
        minIntervalHours: 24,
        copyTemplate: 'Your morning intelligence: {summary}',
        conditions: [
          { field: 'morningDigestEnabled', operator: 'eq', value: true },
        ],
      },
      {
        id: 'habit_streak_support',
        segment: 'habit_forming',
        type: 'habit_reinforcement',
        channel: 'push',
        maxPerDay: 1,
        minIntervalHours: 24,
        copyTemplate: 'Your watchlist is waiting—{count} coins moved today',
        conditions: [
          { field: 'currentStreak', operator: 'gte', value: 5 },
          { field: 'hadSessionToday', operator: 'eq', value: false },
        ],
      },
    ],
  },
  
  power_user: {
    segment: 'power_user',
    description: 'Highly engaged users (Month 2+)',
    jobToBeDone: 'Deepen analytical capability, treat Coinet as research workstation',
    loopEmphasis: ['investment', 'variable_reward'],
    nextBestActions: [
      'Use advanced features',
      'Refer a friend',
      'Provide feedback',
    ],
    notificationRules: [
      {
        id: 'power_high_signal',
        segment: 'power_user',
        type: 'regime_shift',
        channel: 'push',
        maxPerDay: 2,
        minIntervalHours: 6,
        copyTemplate: '{signal_type}: {summary}',
        conditions: [
          { field: 'signalStrength', operator: 'gte', value: 0.7 },
        ],
      },
      {
        id: 'power_validation',
        segment: 'power_user',
        type: 'decision_validation',
        channel: 'in_app',
        maxPerDay: 1,
        minIntervalHours: 168, // Weekly
        copyTemplate: 'Your watchlist QS: {avgQs} avg. You\'re watching quality projects.',
        conditions: [
          { field: 'watchlistSize', operator: 'gte', value: 5 },
        ],
      },
    ],
  },
  
  churning: {
    segment: 'churning',
    description: 'At-risk users with declining engagement',
    jobToBeDone: 'Re-engage with high-value, personalized intelligence',
    loopEmphasis: ['trigger', 'variable_reward'],
    nextBestActions: [
      'Return to check watchlist',
      'Experience a winning call',
      'Simplify notification preferences',
    ],
    notificationRules: [
      {
        id: 'churn_win_back',
        segment: 'churning',
        type: 'opportunity_moment',
        channel: 'push',
        maxPerDay: 1,
        minIntervalHours: 72,
        copyTemplate: '{symbol} is making moves—your OmniScore thesis is playing out',
        conditions: [
          { field: 'daysSinceLastSession', operator: 'gte', value: 3 },
          { field: 'hasWatchlist', operator: 'eq', value: true },
        ],
      },
    ],
  },
  
  dormant: {
    segment: 'dormant',
    description: 'Inactive users (14+ days)',
    jobToBeDone: 'Win back with high-value, zero-friction re-engagement',
    loopEmphasis: ['trigger'],
    nextBestActions: [
      'One-tap check-in',
      'Major market update',
      'Account status update',
    ],
    notificationRules: [
      {
        id: 'dormant_major_event',
        segment: 'dormant',
        type: 'regime_shift',
        channel: 'push',
        maxPerDay: 1,
        minIntervalHours: 168, // Weekly max
        copyTemplate: 'Major market shift: {regime}. Your watchlist is {impact}.',
        conditions: [
          { field: 'daysSinceLastSession', operator: 'gte', value: 14 },
          { field: 'hasWatchlist', operator: 'eq', value: true },
          { field: 'regimeSeverity', operator: 'gte', value: 0.7 },
        ],
      },
    ],
  },
};

// =============================================================================
// SEGMENTATION ENGINE
// =============================================================================

/**
 * Determine user's lifecycle segment based on behavior
 */
export async function classifyUserSegment(userId: string): Promise<LifecycleSegment> {
  try {
    const lifecycle = await prismaRetention.userLifecycleState.findUnique({
      where: { userId },
    });
    
    // Get signup date and session data
    const [user, recentSessions] = await Promise.all([
      (prisma as any).user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      }),
      prismaRetention.userSession.findMany({
        where: {
          userId,
          sessionStart: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { sessionStart: 'desc' },
        take: 100,
      }),
    ]);
    
    if (!user) return 'new_user';
    
    const daysSinceSignup = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (24 * 60 * 60 * 1000)
    );
    
    // Calculate engagement metrics
    const last7DaysSessions = recentSessions.filter(s =>
      s.sessionStart >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;
    
    const last14DaysSessions = recentSessions.filter(s =>
      s.sessionStart >= new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    ).length;
    
    const lastSessionDate = recentSessions[0]?.sessionStart;
    const daysSinceLastSession = lastSessionDate ?
      Math.floor((Date.now() - lastSessionDate.getTime()) / (24 * 60 * 60 * 1000)) : 999;
    
    // DORMANT: No activity in 14+ days
    if (daysSinceLastSession >= 14) {
      return 'dormant';
    }
    
    // CHURNING: Declining engagement (was active, now dropping off)
    if (daysSinceSignup > 7 && last7DaysSessions < 2 && daysSinceLastSession >= 3) {
      return 'churning';
    }
    
    // NEW_USER: First 1-2 days
    if (daysSinceSignup <= 1) {
      return 'new_user';
    }
    
    // EARLY: Days 2-7
    if (daysSinceSignup <= 7) {
      return 'early';
    }
    
    // POWER_USER: Month 2+ with consistent engagement
    if (daysSinceSignup >= 30 && last7DaysSessions >= 4) {
      return 'power_user';
    }
    
    // HABIT_FORMING: Week 2-4
    return 'habit_forming';
  } catch (error) {
    logger.debug('Segment classification error', { userId, error });
    return 'new_user';
  }
}

/**
 * Update user's lifecycle state with full context
 */
export async function updateLifecycleState(userId: string): Promise<UserLifecycleContext> {
  const startTime = performance.now();
  
  try {
    // Get current segment
    const newSegment = await classifyUserSegment(userId);
    
    // Get existing state
    const existing = await prismaRetention.userLifecycleState.findUnique({
      where: { userId },
    });
    
    // Calculate all metrics
    const [user, sessions, watchlist, alerts, preferences] = await Promise.all([
      (prisma as any).user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      }),
      prismaRetention.userSession.findMany({
        where: {
          userId,
          sessionStart: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { sessionStart: 'desc' },
      }),
      prisma.userWatchlist.count({
        where: { userId, isArchived: false } as any,
      }),
      prismaRetention.retentionAlert.count({
        where: { userId, isActive: true },
      }),
      prisma.userPreferences.findUnique({
        where: { userId },
      }),
    ]);
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const daysSinceSignup = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (24 * 60 * 60 * 1000)
    );
    
    const totalSessions = sessions.length;
    const sessionsLast7Days = sessions.filter(s =>
      s.sessionStart >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;
    const sessionsLast30Days = sessions.length;
    
    // Calculate streak
    const streak = calculateStreak(sessions.map(s => s.sessionStart));
    const lastSessionDate = sessions[0]?.sessionStart ?? null;
    
    // Calculate averages
    const avgSessionsPerWeek = sessionsLast30Days / 4;
    const avgQueriesPerSession = sessions.reduce((sum, s) => sum + s.queriesCount, 0) / 
      Math.max(sessions.length, 1);
    const avgSessionDuration = sessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0) /
      Math.max(sessions.length, 1);
    
    // Calculate churn probability
    const churnProbability = calculateChurnProbability({
      daysSinceLastSession: lastSessionDate ?
        Math.floor((Date.now() - lastSessionDate.getTime()) / (24 * 60 * 60 * 1000)) : 999,
      sessionsLast7Days,
      avgSessionsPerWeek,
      watchlistSize: watchlist,
      alertsConfigured: alerts,
    });
    
    // Upsert lifecycle state
    const lifecycleState = await prismaRetention.userLifecycleState.upsert({
      where: { userId },
      update: {
        segment: newSegment,
        previousSegment: existing?.segment !== newSegment ? existing?.segment : existing?.previousSegment,
        segmentEnteredAt: existing?.segment !== newSegment ? new Date() : existing?.segmentEnteredAt,
        daysSinceSignup,
        totalSessions,
        sessionsLast7Days,
        sessionsLast30Days,
        currentStreak: streak.current,
        longestStreak: Math.max(existing?.longestStreak ?? 0, streak.current),
        lastSessionDate,
        watchlistSize: watchlist,
        alertsConfigured: alerts,
        portfolioShared: (existing?.portfolioShared ?? false),
        riskToleranceSet: !!preferences?.riskTolerance,
        morningDigestEnabled: (preferences as any)?.morningDigestEnabled ?? false,
        avgSessionsPerWeek,
        avgQueriesPerSession,
        avgSessionDuration,
        churnProbability,
        lastChurnPrediction: new Date(),
      },
      create: {
        userId,
        segment: newSegment,
        signupDate: user.createdAt,
        daysSinceSignup,
        totalSessions,
        sessionsLast7Days,
        sessionsLast30Days,
        currentStreak: streak.current,
        longestStreak: streak.current,
        lastSessionDate,
        watchlistSize: watchlist,
        alertsConfigured: alerts,
        portfolioShared: false,
        riskToleranceSet: !!preferences?.riskTolerance,
        morningDigestEnabled: (preferences as any)?.morningDigestEnabled ?? false,
        avgSessionsPerWeek,
        avgQueriesPerSession,
        avgSessionDuration,
        churnProbability,
        lastChurnPrediction: new Date(),
      },
    });
    
    const processingTime = performance.now() - startTime;
    logger.debug('👤 Lifecycle state updated', {
      userId,
      segment: newSegment,
      churnProbability: churnProbability.toFixed(2),
      processingTimeMs: processingTime.toFixed(1),
    });
    
    return {
      userId,
      segment: newSegment,
      segmentEnteredAt: lifecycleState.segmentEnteredAt,
      daysSinceSignup,
      totalSessions,
      sessionsLast7Days,
      currentStreak: streak.current,
      longestStreak: Math.max(existing?.longestStreak ?? 0, streak.current),
      watchlistSize: watchlist,
      alertsConfigured: alerts,
      portfolioShared: lifecycleState.portfolioShared,
      riskToleranceSet: lifecycleState.riskToleranceSet,
      morningDigestEnabled: lifecycleState.morningDigestEnabled,
      churnProbability,
      lastSessionDate,
    };
  } catch (error) {
    logger.error('👤 Lifecycle state update failed', { userId, error });
    
    // Return default context
    return {
      userId,
      segment: 'new_user',
      segmentEnteredAt: new Date(),
      daysSinceSignup: 0,
      totalSessions: 0,
      sessionsLast7Days: 0,
      currentStreak: 0,
      longestStreak: 0,
      watchlistSize: 0,
      alertsConfigured: 0,
      portfolioShared: false,
      riskToleranceSet: false,
      morningDigestEnabled: false,
      churnProbability: 0,
      lastSessionDate: null,
    };
  }
}

/**
 * Get next best actions for a user based on their segment
 */
export function getNextBestActions(context: UserLifecycleContext): string[] {
  const config = SEGMENT_CONFIGS[context.segment];
  const actions: string[] = [];
  
  // Segment-specific actions
  actions.push(...config.nextBestActions);
  
  // Add contextual actions based on user state
  if (context.watchlistSize === 0) {
    actions.unshift('Add your first coin to watchlist');
  }
  
  if (context.watchlistSize > 0 && context.alertsConfigured === 0) {
    actions.push('Set a price alert on your favorite coin');
  }
  
  if (context.sessionsLast7Days >= 4 && !context.morningDigestEnabled) {
    actions.push('Enable morning digest for daily insights');
  }
  
  if (context.currentStreak >= 7 && !context.riskToleranceSet) {
    actions.push('Share your risk tolerance for personalized analysis');
  }
  
  return actions.slice(0, 5); // Max 5 actions
}

/**
 * Get notification rules for a user's current segment
 */
export function getNotificationRules(segment: LifecycleSegment): NotificationRule[] {
  return SEGMENT_CONFIGS[segment].notificationRules;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateStreak(sessionDates: Date[]): { current: number; longest: number } {
  if (sessionDates.length === 0) return { current: 0, longest: 0 };
  
  // Sort by date descending
  const sortedDates = [...sessionDates].sort((a, b) => b.getTime() - a.getTime());
  
  // Convert to day strings
  const dayStrings = sortedDates.map(d => d.toISOString().split('T')[0]);
  const uniqueDays = [...new Set(dayStrings)];
  
  // Check if there's activity today or yesterday
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) {
    return { current: 0, longest: calculateLongestStreak(uniqueDays) };
  }
  
  // Count consecutive days
  let current = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const prevDate = new Date(uniqueDays[i - 1]);
    const currDate = new Date(uniqueDays[i]);
    const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / (24 * 60 * 60 * 1000));
    
    if (diffDays === 1) {
      current++;
    } else {
      break;
    }
  }
  
  return { current, longest: Math.max(current, calculateLongestStreak(uniqueDays)) };
}

function calculateLongestStreak(uniqueDays: string[]): number {
  if (uniqueDays.length === 0) return 0;
  
  let longest = 1;
  let current = 1;
  
  for (let i = 1; i < uniqueDays.length; i++) {
    const prevDate = new Date(uniqueDays[i - 1]);
    const currDate = new Date(uniqueDays[i]);
    const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / (24 * 60 * 60 * 1000));
    
    if (diffDays === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }
  
  return longest;
}

interface ChurnFactors {
  daysSinceLastSession: number;
  sessionsLast7Days: number;
  avgSessionsPerWeek: number;
  watchlistSize: number;
  alertsConfigured: number;
}

function calculateChurnProbability(factors: ChurnFactors): number {
  // Simple logistic regression-style scoring
  // Higher score = higher churn risk
  
  let score = 0;
  
  // Days since last session (major factor)
  if (factors.daysSinceLastSession >= 14) score += 0.5;
  else if (factors.daysSinceLastSession >= 7) score += 0.3;
  else if (factors.daysSinceLastSession >= 3) score += 0.15;
  
  // Recent engagement (inverse relationship)
  if (factors.sessionsLast7Days === 0) score += 0.25;
  else if (factors.sessionsLast7Days <= 1) score += 0.1;
  else if (factors.sessionsLast7Days >= 5) score -= 0.15;
  
  // Investment depth (protective factor)
  if (factors.watchlistSize >= 5) score -= 0.1;
  if (factors.alertsConfigured >= 2) score -= 0.1;
  
  // Average engagement (baseline)
  if (factors.avgSessionsPerWeek < 1) score += 0.1;
  else if (factors.avgSessionsPerWeek >= 4) score -= 0.1;
  
  // Clamp to 0-1
  return Math.max(0, Math.min(1, score));
}

// =============================================================================
// BATCH OPERATIONS
// =============================================================================

/**
 * Update lifecycle states for all active users
 * Run this on a schedule (e.g., hourly)
 */
export async function batchUpdateLifecycleStates(): Promise<{ updated: number; errors: number }> {
  const startTime = performance.now();
  
  try {
    // Get users with recent activity or who need updates
    const users = await prismaRetention.userLifecycleState.findMany({
      where: {
        OR: [
          { updatedAt: { lt: new Date(Date.now() - 60 * 60 * 1000) } }, // Not updated in last hour
          { churnProbability: { gte: 0.5 } }, // High churn risk
        ],
      },
      select: { userId: true },
      take: 500,
    });
    
    let updated = 0;
    let errors = 0;
    
    // Process in batches
    const batchSize = 50;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async ({ userId }) => {
          try {
            await updateLifecycleState(userId);
            updated++;
          } catch {
            errors++;
          }
        })
      );
    }
    
    const processingTime = performance.now() - startTime;
    logger.info('👤 Batch lifecycle update complete', {
      processed: users.length,
      updated,
      errors,
      processingTimeMs: processingTime.toFixed(1),
    });
    
    return { updated, errors };
  } catch (error) {
    logger.error('👤 Batch lifecycle update failed', { error });
    return { updated: 0, errors: 1 };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const lifecycleSegmentation = {
  classify: classifyUserSegment,
  update: updateLifecycleState,
  getNextBestActions,
  getNotificationRules,
  batchUpdate: batchUpdateLifecycleStates,
  configs: SEGMENT_CONFIGS,
};

export default lifecycleSegmentation;
