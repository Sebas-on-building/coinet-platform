/**
 * 🌅 COINET DAILY RITUAL GENERATOR
 * 
 * The Daily Ritual: Morning / Midday / Evening intelligence cards
 * 
 * Time-to-Value Targets:
 * - Morning: <5 seconds to insight consumed
 * - Midday: <8 seconds (includes deciding if action needed)
 * - Evening: <10 seconds (reflective, not urgent)
 * 
 * Core Principles:
 * - Pre-generated cards ready when user opens app
 * - No waiting, no loading—intelligence is ready
 * - Progressive disclosure: headline + expand for details
 * - Skip if market was flat (<2% moves on watched assets)
 * 
 * @module retention/daily-ritual-generator
 * @version 1.0.0
 */

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { prismaRetention } from './prisma-retention';
import {
  RitualTime,
  DailyRitualConfig,
  RitualCard,
} from './types';

// =============================================================================
// CONFIGURATION
// =============================================================================

const RITUAL_CONFIGS: Record<RitualTime, DailyRitualConfig> = {
  morning: {
    time: 'morning',
    localTimeRange: ['06:00', '09:00'],
    timeToValueTarget: 5,
    defaultCTAs: ['View full watchlist', 'Market overview'],
    skipConditions: ['Market flat (<2% on major assets)', 'User already checked in'],
  },
  midday: {
    time: 'midday',
    localTimeRange: ['12:00', '14:00'],
    timeToValueTarget: 8,
    defaultCTAs: ['See details', 'Set another alert'],
    skipConditions: ['No material changes', 'User recently active'],
  },
  evening: {
    time: 'evening',
    localTimeRange: ['19:00', '22:00'],
    timeToValueTarget: 10,
    defaultCTAs: ["Tomorrow's watch", 'Week summary'],
    skipConditions: ['No activity today'],
  },
};

// =============================================================================
// RITUAL CARD GENERATOR
// =============================================================================

/**
 * Generate a ritual card for the specified time slot
 */
export async function generateRitualCard(
  userId: string,
  time: RitualTime
): Promise<RitualCard> {
  const startTime = performance.now();
  
  try {
    switch (time) {
      case 'morning':
        return await generateMorningCard(userId);
      case 'midday':
        return await generateMiddayCard(userId);
      case 'evening':
        return await generateEveningCard(userId);
    }
  } catch (error) {
    logger.error('🌅 Ritual card generation failed', { userId, time, error });
    return createFallbackCard(userId, time);
  } finally {
    const processingTime = performance.now() - startTime;
    logger.debug('🌅 Ritual card generated', {
      userId,
      time,
      processingTimeMs: processingTime.toFixed(1),
    });
  }
}

// =============================================================================
// MORNING RITUAL (6-9am)
// =============================================================================

async function generateMorningCard(userId: string): Promise<RitualCard> {
  // Get watchlist and overnight data
  const [watchlist, regime, coinStates] = await Promise.all([
    prisma.userWatchlist.findMany({
      where: { userId, isArchived: false } as any,
      orderBy: { addedAt: 'desc' },
    }),
    prismaRetention.marketRegimeState.findFirst({
      where: { isActive: true },
    }),
    getWatchlistCoinStates(userId),
  ]);
  
  // Calculate watchlist performance
  const moves = coinStates.map(coin => ({
    symbol: coin.symbol,
    change: coin.price24hChange ?? 0,
    direction: (coin.price24hChange ?? 0) > 0.5 ? 'up' as const :
               (coin.price24hChange ?? 0) < -0.5 ? 'down' as const : 'flat' as const,
    price: coin.price,
    indicator: (coin.price24hChange ?? 0) > 0 ? 'up' as const :
               (coin.price24hChange ?? 0) < 0 ? 'down' as const : 'neutral' as const,
  }));
  
  const upCount = moves.filter(m => m.direction === 'up').length;
  const downCount = moves.filter(m => m.direction === 'down').length;
  const flatCount = moves.filter(m => m.direction === 'flat').length;
  const avgChange = moves.length > 0 ? 
    moves.reduce((sum, m) => sum + m.change, 0) / moves.length : 0;
  
  // Check skip condition
  const maxMove = Math.max(...moves.map(m => Math.abs(m.change)), 0);
  if (maxMove < 2 && watchlist.length > 0) {
    return {
      time: 'morning',
      userId,
      layout: 'morning_summary',
      headline: 'Good morning. Market was quiet overnight.',
      metrics: [],
      watchlistSummary: {
        upCount: 0,
        downCount: 0,
        flatCount: watchlist.length,
        avgChange: 0,
      },
      marketContext: regime ? {
        regime: formatRegime(regime.regime),
        regimeStable: !regime.previousRegime || regime.regime === regime.previousRegime,
        fearGreedIndex: regime.fearGreedIndex ?? 50,
        fearGreedLabel: getFearGreedLabel(regime.fearGreedIndex ?? 50),
      } : undefined,
      primaryCTA: 'View Watchlist',
      secondaryCTA: 'Market Overview',
      generatedAt: new Date(),
      wasSkipped: true,
      skipReason: 'Market flat (<2% moves)',
    };
  }
  
  // Find best/worst performers
  const sortedMoves = [...moves].sort((a, b) => b.change - a.change);
  const bestPerformer = sortedMoves[0];
  const worstPerformer = sortedMoves[sortedMoves.length - 1];
  
  // Build headline
  const emoji = upCount > downCount ? '🟢' : upCount < downCount ? '🔴' : '⚪';
  const headline = `Good morning. Overnight Summary:`;
  
  // Build metrics
  const metrics = [
    ...sortedMoves.slice(0, 3).map(m => ({
      label: m.symbol,
      value: `$${formatPrice(m.price)}`,
      change: m.change,
      indicator: m.indicator,
    })),
  ];
  
  // Add Fear & Greed if available
  if (regime?.fearGreedIndex) {
    metrics.push({
      label: 'Fear & Greed',
      value: `${regime.fearGreedIndex} (${getFearGreedLabel(regime.fearGreedIndex)})`,
      change: undefined,
      indicator: 'neutral' as const,
    });
  }
  
  // Find spotlight coin (biggest positive OmniScore change)
  const spotlight = coinStates
    .filter(c => c.qs > 70 && c.price24hChange && c.price24hChange > 3)
    .sort((a, b) => (b.price24hChange ?? 0) - (a.price24hChange ?? 0))[0];
  
  return {
    time: 'morning',
    userId,
    layout: 'morning_summary',
    headline,
    metrics,
    watchlistSummary: {
      upCount,
      downCount,
      flatCount,
      avgChange,
      bestPerformer: bestPerformer && bestPerformer.change > 0 ? {
        symbol: bestPerformer.symbol,
        change: bestPerformer.change,
      } : undefined,
      worstPerformer: worstPerformer && worstPerformer.change < 0 ? {
        symbol: worstPerformer.symbol,
        change: worstPerformer.change,
      } : undefined,
    },
    marketContext: regime ? {
      regime: formatRegime(regime.regime),
      regimeStable: !regime.previousRegime || regime.regime === regime.previousRegime,
      fearGreedIndex: regime.fearGreedIndex ?? 50,
      fearGreedLabel: getFearGreedLabel(regime.fearGreedIndex ?? 50),
    } : undefined,
    spotlight: spotlight ? {
      type: 'top_mover',
      symbol: spotlight.symbol,
      reason: `+${spotlight.price24hChange?.toFixed(1)}% with strong fundamentals (QS ${spotlight.qs.toFixed(0)})`,
    } : undefined,
    primaryCTA: 'View Watchlist',
    secondaryCTA: 'Market Overview',
    generatedAt: new Date(),
    wasSkipped: false,
  };
}

// =============================================================================
// MIDDAY CHECK-IN (12-2pm)
// =============================================================================

async function generateMiddayCard(userId: string): Promise<RitualCard> {
  // Get recent alerts triggered
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
  
  const [triggeredAlerts, coinStates, watchlist] = await Promise.all([
    prismaRetention.notificationDelivery.findMany({
      where: {
        userId,
        notificationType: { in: ['price_threshold', 'omniscore_change', 'watchlist_threshold'] },
        createdAt: { gte: todayStart },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    }),
    getWatchlistCoinStates(userId),
    prisma.userWatchlist.findMany({
      where: { userId, isArchived: false } as any,
    }),
  ]);
  
  // Calculate watchlist status
  const moves = coinStates.map(coin => ({
    symbol: coin.symbol,
    change: coin.price24hChange ?? 0,
    direction: (coin.price24hChange ?? 0) > 0.5 ? 'up' as const :
               (coin.price24hChange ?? 0) < -0.5 ? 'down' as const : 'flat' as const,
  }));
  
  const upCount = moves.filter(m => m.direction === 'up').length;
  const downCount = moves.filter(m => m.direction === 'down').length;
  const flatCount = moves.filter(m => m.direction === 'flat').length;
  
  // Check if there are any material changes
  const maxMove = Math.max(...moves.map(m => Math.abs(m.change)), 0);
  if (maxMove < 2 && triggeredAlerts.length === 0) {
    return {
      time: 'midday',
      userId,
      layout: 'market_update',
      headline: 'No major moves on your watchlist—market\'s quiet',
      metrics: [],
      watchlistSummary: {
        upCount,
        downCount,
        flatCount,
        avgChange: 0,
      },
      primaryCTA: 'Check Watchlist',
      secondaryCTA: 'Set Alert',
      generatedAt: new Date(),
      wasSkipped: true,
      skipReason: 'No material changes',
    };
  }
  
  // Find the highlight (biggest move or triggered alert)
  const highlight = triggeredAlerts[0];
  const biggestMover = [...moves].sort((a, b) => Math.abs(b.change) - Math.abs(a.change))[0];
  
  let headline: string;
  let metrics: RitualCard['metrics'] = [];
  
  if (highlight) {
    const symbol = highlight.symbol;
    const coinState = coinStates.find(c => c.symbol === symbol);
    
    headline = `Market Update (since this morning)`;
    metrics = [
      {
        label: `${symbol} Alert Triggered`,
        value: coinState ? `$${formatPrice(coinState.price)}` : 'N/A',
        change: coinState?.price24hChange,
        indicator: (coinState?.price24hChange ?? 0) >= 0 ? 'up' : 'down',
      },
    ];
    
    if (coinState) {
      metrics.push({
        label: 'OmniScore',
        value: `${coinState.pos.toFixed(0)}/100`,
        indicator: coinState.pos >= 60 ? 'up' : coinState.pos <= 40 ? 'down' : 'neutral',
      });
    }
  } else if (biggestMover && Math.abs(biggestMover.change) > 3) {
    const coinState = coinStates.find(c => c.symbol === biggestMover.symbol);
    headline = `${biggestMover.symbol} ${biggestMover.change > 0 ? 'up' : 'down'} ${Math.abs(biggestMover.change).toFixed(1)}%`;
    
    if (coinState) {
      metrics = [
        {
          label: biggestMover.symbol,
          value: `$${formatPrice(coinState.price)}`,
          change: biggestMover.change,
          indicator: biggestMover.change >= 0 ? 'up' : 'down',
        },
        {
          label: 'OmniScore',
          value: `${coinState.pos.toFixed(0)}/100`,
          indicator: 'neutral',
        },
      ];
    }
  } else {
    headline = 'Market Update';
    metrics = moves.slice(0, 3).map(m => ({
      label: m.symbol,
      value: `${m.change >= 0 ? '+' : ''}${m.change.toFixed(1)}%`,
      indicator: m.direction === 'up' ? 'up' as const : 
                 m.direction === 'down' ? 'down' as const : 'neutral' as const,
    }));
  }
  
  // Summary
  const summaryEmoji = upCount > downCount ? '🟢' : upCount < downCount ? '🔴' : '⚪';
  const summaryText = `Your watchlist: ${upCount} up, ${downCount} down, ${flatCount} flat ${summaryEmoji}`;
  
  return {
    time: 'midday',
    userId,
    layout: 'market_update',
    headline,
    metrics,
    watchlistSummary: {
      upCount,
      downCount,
      flatCount,
      avgChange: moves.reduce((s, m) => s + m.change, 0) / Math.max(moves.length, 1),
    },
    primaryCTA: 'See Details',
    secondaryCTA: 'Set Another Alert',
    generatedAt: new Date(),
    wasSkipped: false,
  };
}

// =============================================================================
// EVENING REVIEW (7-10pm)
// =============================================================================

async function generateEveningCard(userId: string): Promise<RitualCard> {
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));
  
  const [coinStates, todayQueries, regime, lifecycle] = await Promise.all([
    getWatchlistCoinStates(userId),
    prismaRetention.userQuery.count({
      where: {
        userId,
        createdAt: { gte: todayStart },
      },
    }),
    prismaRetention.marketRegimeState.findFirst({
      where: { isActive: true },
    }),
    prismaRetention.userLifecycleState.findUnique({
      where: { userId },
    }),
  ]);
  
  // Calculate daily performance
  const moves = coinStates.map(coin => ({
    symbol: coin.symbol,
    change: coin.price24hChange ?? 0,
    qs: coin.qs,
    quadrant: coin.quadrant,
    quadrantChanged: coin.previousQuadrant && coin.quadrant !== coin.previousQuadrant,
  }));
  
  const avgChange = moves.length > 0 ?
    moves.reduce((sum, m) => sum + m.change, 0) / moves.length : 0;
  
  const sortedMoves = [...moves].sort((a, b) => b.change - a.change);
  const best = sortedMoves[0];
  const worst = sortedMoves[sortedMoves.length - 1];
  
  // Check for quadrant changes (interesting events)
  const quadrantChanges = moves.filter(m => m.quadrantChanged);
  
  // Build headline
  const dayOfWeek = new Date().getDay();
  const isFriday = dayOfWeek === 5;
  
  let headline: string;
  if (isFriday) {
    headline = "This Week's Intelligence Recap";
  } else {
    headline = "Today's Intelligence Recap";
  }
  
  // Build metrics
  const metrics: RitualCard['metrics'] = [];
  
  // Performance summary
  if (moves.length > 0) {
    const vsMarket = regime?.btc24hChange ? avgChange - regime.btc24hChange : undefined;
    metrics.push({
      label: 'Your Watchlist',
      value: `${avgChange >= 0 ? '+' : ''}${avgChange.toFixed(1)}%`,
      change: vsMarket,
      indicator: avgChange >= 0 ? 'up' : 'down',
    });
  }
  
  // Best performer
  if (best && best.change > 0) {
    const reason = quadrantChanges.find(q => q.symbol === best.symbol) ?
      `(entered ${formatQuadrant(best.quadrant)})` : '';
    metrics.push({
      label: `Best: ${best.symbol}`,
      value: `+${best.change.toFixed(1)}% ${reason}`,
      indicator: 'up',
    });
  }
  
  // Worst performer
  if (worst && worst.change < 0) {
    metrics.push({
      label: `Worst: ${worst.symbol}`,
      value: `${worst.change.toFixed(1)}%`,
      indicator: 'down',
    });
  }
  
  // Today's activity
  metrics.push({
    label: 'You Analyzed',
    value: `${todayQueries} coins today`,
    indicator: 'neutral',
  });
  
  // Regime status
  if (regime) {
    metrics.push({
      label: 'Market Regime',
      value: regime.previousRegime && regime.regime !== regime.previousRegime ?
        `${formatRegime(regime.previousRegime)} → ${formatRegime(regime.regime)}` :
        `Still ${formatRegime(regime.regime)}`,
      indicator: 'neutral',
    });
  }
  
  // Find spotlight (best call)
  let spotlight: RitualCard['spotlight'];
  if (best && best.change > 5) {
    spotlight = {
      type: 'best_call',
      symbol: best.symbol,
      reason: `+${best.change.toFixed(1)}% today${best.qs > 70 ? ' (strong fundamentals)' : ''}`,
    };
  } else if (quadrantChanges.length > 0) {
    const change = quadrantChanges[0];
    spotlight = {
      type: 'builder_opportunity',
      symbol: change.symbol,
      reason: `Moved to ${formatQuadrant(change.quadrant)}`,
    };
  }
  
  return {
    time: 'evening',
    userId,
    layout: 'evening_recap',
    headline,
    metrics,
    watchlistSummary: {
      upCount: moves.filter(m => m.change > 0.5).length,
      downCount: moves.filter(m => m.change < -0.5).length,
      flatCount: moves.filter(m => Math.abs(m.change) <= 0.5).length,
      avgChange,
      bestPerformer: best && best.change > 0 ? { symbol: best.symbol, change: best.change } : undefined,
      worstPerformer: worst && worst.change < 0 ? { symbol: worst.symbol, change: worst.change } : undefined,
    },
    marketContext: regime ? {
      regime: formatRegime(regime.regime),
      regimeStable: !regime.previousRegime || regime.regime === regime.previousRegime,
      fearGreedIndex: regime.fearGreedIndex ?? 50,
      fearGreedLabel: getFearGreedLabel(regime.fearGreedIndex ?? 50),
    } : undefined,
    spotlight,
    primaryCTA: isFriday ? 'Week Summary' : "Tomorrow's Watch",
    secondaryCTA: 'Anything Else?',
    generatedAt: new Date(),
    wasSkipped: false,
  };
}

// =============================================================================
// HELPERS
// =============================================================================

async function getWatchlistCoinStates(userId: string) {
  const watchlist = await prisma.userWatchlist.findMany({
    where: { userId, isArchived: false } as any,
  });
  
  if (watchlist.length === 0) return [];
  
  const symbols = watchlist.map(w => w.symbol);
  
  return prismaRetention.coinStateSnapshot.findMany({
    where: { symbol: { in: symbols } },
    orderBy: { createdAt: 'desc' },
    distinct: ['symbol'],
  });
}

function createFallbackCard(userId: string, time: RitualTime): RitualCard {
  return {
    time,
    userId,
    layout: time === 'morning' ? 'morning_summary' : 
            time === 'midday' ? 'market_update' : 'evening_recap',
    headline: time === 'morning' ? 'Good morning.' :
              time === 'midday' ? 'Market update.' : 'Day in review.',
    metrics: [],
    primaryCTA: 'View Watchlist',
    secondaryCTA: 'Explore',
    generatedAt: new Date(),
    wasSkipped: true,
    skipReason: 'Error generating card',
  };
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

function formatQuadrant(quadrant: string): string {
  const formats: Record<string, string> = {
    builder: 'Builder Zone',
    target: 'Target Zone',
    avoid: 'Avoid Zone',
    moon_or_doom: 'Moon or Doom',
  };
  return formats[quadrant] ?? quadrant;
}

function getFearGreedLabel(index: number): string {
  if (index <= 20) return 'Extreme Fear';
  if (index <= 40) return 'Fear';
  if (index <= 60) return 'Neutral';
  if (index <= 80) return 'Greed';
  return 'Extreme Greed';
}

function formatPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (price >= 1) return price.toFixed(2);
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(6);
}

// =============================================================================
// PRE-GENERATION FOR PERFORMANCE
// =============================================================================

/**
 * Pre-generate ritual cards for all active users
 * Run this on a schedule (e.g., 5 minutes before each ritual window)
 */
export async function preGenerateRitualCards(time: RitualTime): Promise<number> {
  const startTime = performance.now();
  
  try {
    // Get active users with appropriate preferences
    const users = await prismaRetention.userLifecycleState.findMany({
      where: {
        segment: { notIn: ['dormant', 'churning'] },
        lastSessionDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { userId: true },
      take: 1000, // Batch limit
    });
    
    let generated = 0;
    
    // Generate cards in batches of 50
    const batchSize = 50;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      
      await Promise.all(
        batch.map(async ({ userId }) => {
          try {
            const card = await generateRitualCard(userId, time);
            // Store for later retrieval (could use Redis for faster access)
            // For now, the cards are generated on-demand
            generated++;
          } catch {
            // Skip failed generations
          }
        })
      );
    }
    
    const processingTime = performance.now() - startTime;
    logger.info('🌅 Ritual cards pre-generated', {
      time,
      usersProcessed: users.length,
      generated,
      processingTimeMs: processingTime.toFixed(1),
    });
    
    return generated;
  } catch (error) {
    logger.error('🌅 Ritual card pre-generation failed', { time, error });
    return 0;
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const dailyRitualGenerator = {
  generate: generateRitualCard,
  preGenerate: preGenerateRitualCards,
  configs: RITUAL_CONFIGS,
};

export default dailyRitualGenerator;
