/**
 * 🎨 COINET PERSONALIZATION ENGINE
 * 
 * Adapt content and triggers based on user context
 * 
 * Personalization Data Sources:
 * - Watchlist composition (which coins, when added, interaction frequency)
 * - Risk tolerance (from chat keywords or explicit setting)
 * - Trading timeframe (day trader vs HODLer patterns)
 * - Portfolio holdings (if shared)
 * - Prior behavior (session time, frequency, query depth)
 * - Intent history (what user typically asks)
 * 
 * Adaptations:
 * - Alert prioritization (risk vs opportunity)
 * - Notification frequency and timing
 * - Response format (quick vs deep)
 * - Educational prompts (new vs power users)
 * - Content complexity level
 * 
 * @module retention/personalization-engine
 * @version 1.0.0
 */

import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { prismaRetention } from './prisma-retention';
import {
  PersonalizationContext,
  PersonalizedContent,
  LifecycleSegment,
} from './types';

// =============================================================================
// CONTEXT BUILDER
// =============================================================================

/**
 * Build comprehensive personalization context for a user
 */
export async function getPersonalizationContext(userId: string): Promise<PersonalizationContext> {
  const startTime = performance.now();
  
  try {
    const [watchlist, portfolio, preferences, queries, sessions, lifecycle] = await Promise.all([
      // Watchlist
      prisma.userWatchlist.findMany({
        where: { userId, isArchived: false } as any,
        select: { symbol: true },
      }),
      
      // Portfolio
      prisma.userPortfolio.findMany({
        where: { userId },
        select: { symbol: true },
      }),
      
      // Preferences
      prisma.userPreferences.findUnique({
        where: { userId },
      }),
      
      // Recent queries (last 30 days)
      prismaRetention.userQuery.findMany({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
      
      // Sessions (last 30 days)
      prismaRetention.userSession.findMany({
        where: {
          userId,
          sessionStart: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { sessionStart: 'desc' },
      }),
      
      // Lifecycle
      prismaRetention.userLifecycleState.findUnique({
        where: { userId },
      }),
    ]);
    
    // Calculate intent distribution
    const intentDistribution: Record<string, number> = {};
    for (const query of queries) {
      if (query.intent) {
        intentDistribution[query.intent] = (intentDistribution[query.intent] ?? 0) + 1;
      }
    }
    
    // Calculate session frequency
    const sessionFrequency = sessions.length / 30; // Sessions per day
    
    // Calculate average query depth
    const depthScores: Record<string, number> = {
      quick_answer: 1,
      decision_help: 2,
      deep_analysis: 3,
      troubleshoot: 1,
      learning: 2,
    };
    
    let totalDepth = 0;
    let depthCount = 0;
    for (const query of queries) {
      if (query.intent && depthScores[query.intent]) {
        totalDepth += depthScores[query.intent];
        depthCount++;
      }
    }
    const avgQueryDepth = depthCount > 0 ? totalDepth / depthCount : 2;
    
    // Calculate typical session time
    const sessionHours: number[] = [];
    for (const session of sessions) {
      sessionHours.push(session.sessionStart.getHours());
    }
    const typicalSessionTime = sessionHours.length > 0 ?
      formatHour(Math.round(median(sessionHours))) : undefined;
    
    // Get recent symbols
    const recentSymbols: string[] = [...new Set(
      (queries as any[])
        .flatMap((q: any) => (q.symbols || []) as string[])
        .slice(0, 10)
    )] as string[];
    
    // Extract recent topics from queries
    const recentTopics: string[] = extractTopics(queries.map((q: any) => q.query as string));
    
    const processingTime = performance.now() - startTime;
    logger.debug('🎨 Personalization context built', {
      userId,
      watchlistSize: watchlist.length,
      queryCount: queries.length,
      processingTimeMs: processingTime.toFixed(1),
    });
    
    return {
      userId,
      watchlistSymbols: watchlist.map(w => w.symbol),
      portfolioSymbols: portfolio.map(p => p.symbol),
      riskTolerance: preferences?.riskTolerance as PersonalizationContext['riskTolerance'],
      tradingTimeframe: (preferences as any)?.tradingStyle as PersonalizationContext['tradingTimeframe'],
      preferredDepth: (preferences as any)?.preferredDepth as PersonalizationContext['preferredDepth'],
      typicalSessionTime,
      sessionFrequency,
      avgQueryDepth,
      intentDistribution,
      recentSymbols,
      recentTopics,
    };
  } catch (error) {
    logger.warn('🎨 Personalization context build failed', { userId, error });
    
    return {
      userId,
      watchlistSymbols: [],
      portfolioSymbols: [],
      sessionFrequency: 0,
      avgQueryDepth: 2,
      intentDistribution: {},
      recentSymbols: [],
      recentTopics: [],
    };
  }
}

// =============================================================================
// CONTENT PERSONALIZATION
// =============================================================================

/**
 * Get personalized content settings for a user
 */
export async function getPersonalizedContent(userId: string): Promise<PersonalizedContent> {
  const context = await getPersonalizationContext(userId);
  const lifecycle = await prismaRetention.userLifecycleState.findUnique({
    where: { userId },
  });
  
  const segment = (lifecycle?.segment ?? 'new_user') as LifecycleSegment;
  
  return {
    // Alert prioritization based on risk tolerance
    alertPriority: getAlertPriority(context.riskTolerance),
    
    // Notification frequency based on trading style
    regimeUpdateFrequency: getRegimeFrequency(context.tradingTimeframe),
    
    // Response format based on query depth preference
    defaultResponseFormat: getDefaultFormat(context.avgQueryDepth, context.preferredDepth),
    
    // Digest timing based on session patterns
    digestTime: getDigestTime(context.typicalSessionTime),
    
    // Content complexity based on lifecycle segment
    educationalPrompts: shouldShowEducational(segment),
    showAdvancedMetrics: shouldShowAdvanced(segment, context.avgQueryDepth),
  };
}

// =============================================================================
// PERSONALIZATION LOGIC
// =============================================================================

function getAlertPriority(
  riskTolerance?: 'conservative' | 'moderate' | 'aggressive'
): 'risk_alerts' | 'opportunity_alerts' | 'balanced' {
  switch (riskTolerance) {
    case 'conservative':
      return 'risk_alerts';
    case 'aggressive':
      return 'opportunity_alerts';
    default:
      return 'balanced';
  }
}

function getRegimeFrequency(
  tradingTimeframe?: 'day_trader' | 'swing_trader' | 'hodler'
): 'frequent' | 'daily' | 'weekly' {
  switch (tradingTimeframe) {
    case 'day_trader':
      return 'frequent';
    case 'hodler':
      return 'weekly';
    default:
      return 'daily';
  }
}

function getDefaultFormat(
  avgQueryDepth: number,
  preferredDepth?: 'quick' | 'medium' | 'deep'
): 'quick' | 'decision_help' | 'deep_analysis' {
  // Explicit preference takes priority
  if (preferredDepth) {
    switch (preferredDepth) {
      case 'quick': return 'quick';
      case 'deep': return 'deep_analysis';
      default: return 'decision_help';
    }
  }
  
  // Infer from behavior
  if (avgQueryDepth < 1.5) return 'quick';
  if (avgQueryDepth > 2.5) return 'deep_analysis';
  return 'decision_help';
}

function getDigestTime(
  typicalSessionTime?: string
): 'morning' | 'evening' | 'none' {
  if (!typicalSessionTime) return 'morning';
  
  const hour = parseInt(typicalSessionTime.split(':')[0]);
  
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 17 && hour < 23) return 'evening';
  
  return 'morning';
}

function shouldShowEducational(segment: LifecycleSegment): boolean {
  return segment === 'new_user' || segment === 'early';
}

function shouldShowAdvanced(segment: LifecycleSegment, avgQueryDepth: number): boolean {
  return segment === 'power_user' || avgQueryDepth >= 2.5;
}

// =============================================================================
// CONTENT ADAPTATION
// =============================================================================

/**
 * Adapt notification content based on user preferences
 */
export function adaptNotificationContent(
  userId: string,
  type: string,
  content: { title: string; body: string },
  personalizedContent: PersonalizedContent
): { title: string; body: string } {
  let { title, body } = content;
  
  // Adapt based on alertPriority
  if (type === 'regime_shift') {
    if (personalizedContent.alertPriority === 'risk_alerts') {
      // Emphasize risk aspects
      body = body.replace('affected', 'at risk');
    } else if (personalizedContent.alertPriority === 'opportunity_alerts') {
      // Emphasize opportunity aspects
      body = body.replace('affected', 'with opportunities');
    }
  }
  
  // Adapt complexity for new users
  if (personalizedContent.educationalPrompts) {
    // Simplify jargon
    body = body
      .replace(/QS \d+/g, (match) => `${match} (Quality)`)
      .replace(/OS \d+/g, (match) => `${match} (Opportunity)`);
  }
  
  return { title, body };
}

/**
 * Adapt response format instructions for AI
 */
export function getPersonalizedFormatInstructions(
  personalizedContent: PersonalizedContent
): string {
  const baseInstructions: Record<string, string> = {
    quick: `Keep response very brief:
- 1-2 sentences max
- Just the key number/answer
- Optional: 1 supporting bullet`,
    
    decision_help: `Use 3-Block format:
BLOCK 1 (Answer): Clear recommendation in 1-2 sentences
BLOCK 2 (Why): 3 bullet points with key signals
BLOCK 3 (Next): One specific action`,
    
    deep_analysis: `Provide comprehensive analysis:
- Full OmniScore breakdown with exact numbers
- QS, OS, POS, quadrant position
- Risk assessment
- Clear structure with sections`,
  };
  
  let instructions = baseInstructions[personalizedContent.defaultResponseFormat] ?? 
                    baseInstructions.decision_help;
  
  // Add educational context for new users
  if (personalizedContent.educationalPrompts) {
    instructions += `\n\n[Educational Mode]
- Explain acronyms when first used (e.g., "QS (Quality Score)")
- Add brief "why this matters" context
- Offer to explain concepts: "Want me to break down [X]?"`;
  }
  
  // Add advanced metrics for power users
  if (personalizedContent.showAdvancedMetrics) {
    instructions += `\n\n[Advanced Mode]
- Include derivatives signals when relevant
- Reference historical percentiles
- Show confidence bands where available`;
  }
  
  return instructions;
}

/**
 * Get personalized quick-reply chips
 */
export function getPersonalizedQuickReplies(
  context: PersonalizationContext,
  currentSymbol?: string
): string[] {
  const chips: string[] = [];
  
  // Add symbol-specific chips
  if (currentSymbol) {
    chips.push(`Should I buy ${currentSymbol}?`);
    chips.push('Show full OmniScore');
  }
  
  // Add risk-appropriate chips
  if (context.riskTolerance === 'conservative') {
    chips.push('What are the risks?');
    chips.push('Show safer alternatives');
  } else if (context.riskTolerance === 'aggressive') {
    chips.push('Where\'s the alpha?');
    chips.push('Show high-upside plays');
  }
  
  // Add watchlist chips
  if (context.watchlistSymbols.length > 0 && !currentSymbol) {
    chips.push('Check my watchlist');
  }
  
  // Add common chips
  chips.push('Market sentiment');
  chips.push('Compare vs BTC');
  
  return chips.slice(0, 5); // Max 5 chips
}

// =============================================================================
// TRIGGER FILTERING
// =============================================================================

/**
 * Filter and prioritize triggers based on personalization
 */
export function filterTriggersByPersonalization<T extends { type: string; signalStrength: number; symbol?: string }>(
  triggers: T[],
  context: PersonalizationContext,
  personalizedContent: PersonalizedContent
): T[] {
  // Score each trigger based on relevance
  const scoredTriggers = triggers.map(trigger => {
    let score = trigger.signalStrength;
    
    // Boost triggers for watchlist coins
    if (trigger.symbol && context.watchlistSymbols.includes(trigger.symbol)) {
      score *= 1.3;
    }
    
    // Boost based on alert priority
    if (personalizedContent.alertPriority === 'risk_alerts') {
      if (trigger.type === 'regime_shift' || trigger.type.includes('risk')) {
        score *= 1.2;
      }
    } else if (personalizedContent.alertPriority === 'opportunity_alerts') {
      if (trigger.type === 'opportunity_moment' || trigger.type === 'quadrant_transition') {
        score *= 1.2;
      }
    }
    
    // Boost recent symbols
    if (trigger.symbol && context.recentSymbols.includes(trigger.symbol)) {
      score *= 1.1;
    }
    
    return { trigger, score };
  });
  
  // Sort by score and return triggers
  return scoredTriggers
    .sort((a, b) => b.score - a.score)
    .map(st => st.trigger);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function median(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  return sorted.length % 2 !== 0 ?
    sorted[mid] :
    (sorted[mid - 1] + sorted[mid]) / 2;
}

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, '0')}:00`;
}

function extractTopics(queries: string[]): string[] {
  const topicKeywords = [
    'defi', 'nft', 'layer 1', 'layer 2', 'l1', 'l2', 'gaming',
    'metaverse', 'ai', 'meme', 'staking', 'yield', 'lending',
  ];
  
  const foundTopics = new Set<string>();
  
  for (const query of queries) {
    const lowerQuery = query.toLowerCase();
    for (const topic of topicKeywords) {
      if (lowerQuery.includes(topic)) {
        foundTopics.add(topic);
      }
    }
  }
  
  return [...foundTopics];
}

// =============================================================================
// EXPORTS
// =============================================================================

export const personalizationEngine = {
  getContext: getPersonalizationContext,
  getContent: getPersonalizedContent,
  adaptNotification: adaptNotificationContent,
  getFormatInstructions: getPersonalizedFormatInstructions,
  getQuickReplies: getPersonalizedQuickReplies,
  filterTriggers: filterTriggersByPersonalization,
};

export default personalizationEngine;
