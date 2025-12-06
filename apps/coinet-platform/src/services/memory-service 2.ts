/**
 * 🧠 User Memory Service - Phase 3 Divine Integration
 * 
 * Enables the AI to remember and learn about users over time.
 * 
 * CAPABILITIES:
 * - Store/retrieve user memories
 * - Track portfolio holdings
 * - Maintain watchlists
 * - Auto-extract preferences from conversations
 * - Build user context for personalized AI responses
 * 
 * MEMORY CATEGORIES:
 * - preference: Risk tolerance, trading style
 * - portfolio: Holdings and positions
 * - watchlist: Coins being watched
 * - goal: Investment/trading goals
 * - context: Experience level, background
 * - interaction: Communication preferences
 * - insight: AI observations about user
 */

import { prisma } from '../db/client';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export type MemoryCategory = 
  | 'preference'
  | 'portfolio'
  | 'watchlist'
  | 'goal'
  | 'context'
  | 'interaction'
  | 'insight';

export interface Memory {
  category: MemoryCategory;
  key: string;
  value: string;
  confidence?: number;
  source?: string;
}

export interface PortfolioHolding {
  symbol: string;
  name?: string;
  amount: number;
  avgCost?: number;
  exchange?: string;
}

export interface WatchlistItem {
  symbol: string;
  name?: string;
  targetBuy?: number;
  targetSell?: number;
  notes?: string;
}

export interface UserProfile {
  userId: string;
  memories: Memory[];
  portfolio: PortfolioHolding[];
  watchlist: WatchlistItem[];
  preferences: {
    riskTolerance?: string;
    tradingStyle?: string;
    experienceLevel?: string;
    favoriteCoins?: string[];
  };
  lastInteraction?: Date;
}

export interface UserContextForAI {
  hasProfile: boolean;
  contextString: string;
  portfolio: {
    totalHoldings: number;
    topHoldings: string[];
  };
  preferences: {
    riskTolerance?: string;
    tradingStyle?: string;
  };
  watchlist: string[];
  recentTopics: string[];
}

// ============================================================================
// MEMORY OPERATIONS
// ============================================================================

/**
 * Store a memory for a user
 */
export async function storeMemory(
  userId: string,
  memory: Memory
): Promise<void> {
  try {
    await prisma.userMemory.upsert({
      where: {
        userId_category_key: {
          userId,
          category: memory.category,
          key: memory.key,
        },
      },
      update: {
        value: memory.value,
        confidence: memory.confidence ?? 1.0,
        source: memory.source,
        updatedAt: new Date(),
      },
      create: {
        userId,
        category: memory.category,
        key: memory.key,
        value: memory.value,
        confidence: memory.confidence ?? 1.0,
        source: memory.source,
      },
    });

    logger.debug('🧠 Memory stored', { userId, category: memory.category, key: memory.key });
  } catch (error: any) {
    logger.warn('🧠 Failed to store memory', { userId, error: error.message });
  }
}

/**
 * Retrieve a specific memory
 */
export async function getMemory(
  userId: string,
  category: MemoryCategory,
  key: string
): Promise<string | null> {
  try {
    const memory = await prisma.userMemory.findUnique({
      where: {
        userId_category_key: {
          userId,
          category,
          key,
        },
      },
    });

    if (memory) {
      // Update access tracking
      await prisma.userMemory.update({
        where: { id: memory.id },
        data: {
          lastAccessed: new Date(),
          accessCount: { increment: 1 },
        },
      });
    }

    return memory?.value ?? null;
  } catch (error: any) {
    logger.debug('🧠 Failed to get memory', { userId, category, key, error: error.message });
    return null;
  }
}

/**
 * Get all memories for a user in a category
 */
export async function getMemoriesByCategory(
  userId: string,
  category: MemoryCategory
): Promise<Memory[]> {
  try {
    const memories = await prisma.userMemory.findMany({
      where: { userId, category },
      orderBy: { updatedAt: 'desc' },
    });

    return memories.map(m => ({
      category: m.category as MemoryCategory,
      key: m.key,
      value: m.value,
      confidence: m.confidence,
      source: m.source ?? undefined,
    }));
  } catch (error: any) {
    logger.debug('🧠 Failed to get memories by category', { userId, category, error: error.message });
    return [];
  }
}

/**
 * Get all memories for a user
 */
export async function getAllMemories(userId: string): Promise<Memory[]> {
  try {
    const memories = await prisma.userMemory.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    return memories.map(m => ({
      category: m.category as MemoryCategory,
      key: m.key,
      value: m.value,
      confidence: m.confidence,
      source: m.source ?? undefined,
    }));
  } catch (error: any) {
    logger.debug('🧠 Failed to get all memories', { userId, error: error.message });
    return [];
  }
}

/**
 * Delete a memory
 */
export async function deleteMemory(
  userId: string,
  category: MemoryCategory,
  key: string
): Promise<boolean> {
  try {
    await prisma.userMemory.delete({
      where: {
        userId_category_key: { userId, category, key },
      },
    });
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// PORTFOLIO OPERATIONS
// ============================================================================

/**
 * Add or update portfolio holding
 */
export async function updatePortfolio(
  userId: string,
  holding: PortfolioHolding
): Promise<void> {
  try {
    await prisma.userPortfolio.upsert({
      where: {
        userId_symbol_exchange: {
          userId,
          symbol: holding.symbol.toUpperCase(),
          exchange: holding.exchange || 'default',
        },
      },
      update: {
        name: holding.name,
        amount: holding.amount,
        avgCost: holding.avgCost,
        updatedAt: new Date(),
      },
      create: {
        userId,
        symbol: holding.symbol.toUpperCase(),
        name: holding.name,
        amount: holding.amount,
        avgCost: holding.avgCost,
        exchange: holding.exchange || 'default',
      },
    });

    logger.debug('🧠 Portfolio updated', { userId, symbol: holding.symbol });
  } catch (error: any) {
    logger.warn('🧠 Failed to update portfolio', { userId, error: error.message });
  }
}

/**
 * Get user's portfolio
 */
export async function getPortfolio(userId: string): Promise<PortfolioHolding[]> {
  try {
    const holdings = await prisma.userPortfolio.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    return holdings.map(h => ({
      symbol: h.symbol,
      name: h.name ?? undefined,
      amount: h.amount,
      avgCost: h.avgCost ?? undefined,
      exchange: h.exchange ?? undefined,
    }));
  } catch (error: any) {
    logger.debug('🧠 Failed to get portfolio', { userId, error: error.message });
    return [];
  }
}

/**
 * Remove from portfolio
 */
export async function removeFromPortfolio(
  userId: string,
  symbol: string,
  exchange?: string
): Promise<boolean> {
  try {
    await prisma.userPortfolio.delete({
      where: {
        userId_symbol_exchange: {
          userId,
          symbol: symbol.toUpperCase(),
          exchange: exchange || 'default',
        },
      },
    });
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// WATCHLIST OPERATIONS
// ============================================================================

/**
 * Add to watchlist
 */
export async function addToWatchlist(
  userId: string,
  item: WatchlistItem
): Promise<void> {
  try {
    await prisma.userWatchlist.upsert({
      where: {
        userId_symbol: {
          userId,
          symbol: item.symbol.toUpperCase(),
        },
      },
      update: {
        name: item.name,
        targetBuy: item.targetBuy,
        targetSell: item.targetSell,
        notes: item.notes,
      },
      create: {
        userId,
        symbol: item.symbol.toUpperCase(),
        name: item.name,
        targetBuy: item.targetBuy,
        targetSell: item.targetSell,
        notes: item.notes,
      },
    });

    logger.debug('🧠 Watchlist updated', { userId, symbol: item.symbol });
  } catch (error: any) {
    logger.warn('🧠 Failed to update watchlist', { userId, error: error.message });
  }
}

/**
 * Get user's watchlist
 */
export async function getWatchlist(userId: string): Promise<WatchlistItem[]> {
  try {
    const items = await prisma.userWatchlist.findMany({
      where: { userId },
      orderBy: { addedAt: 'desc' },
    });

    return items.map(i => ({
      symbol: i.symbol,
      name: i.name ?? undefined,
      targetBuy: i.targetBuy ?? undefined,
      targetSell: i.targetSell ?? undefined,
      notes: i.notes ?? undefined,
    }));
  } catch (error: any) {
    logger.debug('🧠 Failed to get watchlist', { userId, error: error.message });
    return [];
  }
}

/**
 * Remove from watchlist
 */
export async function removeFromWatchlist(
  userId: string,
  symbol: string
): Promise<boolean> {
  try {
    await prisma.userWatchlist.delete({
      where: {
        userId_symbol: { userId, symbol: symbol.toUpperCase() },
      },
    });
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// USER PROFILE / CONTEXT
// ============================================================================

/**
 * Get complete user profile
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  const [memories, portfolio, watchlist, preferences] = await Promise.all([
    getAllMemories(userId),
    getPortfolio(userId),
    getWatchlist(userId),
    prisma.userPreferences.findUnique({ where: { userId } }),
  ]);

  // Extract specific preferences from memories
  const riskTolerance = memories.find(m => m.key === 'risk_tolerance')?.value;
  const tradingStyle = memories.find(m => m.key === 'trading_style')?.value;
  const experienceLevel = memories.find(m => m.key === 'experience_level')?.value;
  const favoriteCoinsStr = memories.find(m => m.key === 'favorite_coins')?.value;
  const favoriteCoins = favoriteCoinsStr ? favoriteCoinsStr.split(',').map(s => s.trim()) : [];

  return {
    userId,
    memories,
    portfolio,
    watchlist,
    preferences: {
      riskTolerance: riskTolerance || preferences?.riskTolerance || undefined,
      tradingStyle,
      experienceLevel,
      favoriteCoins: favoriteCoins.length > 0 ? favoriteCoins : preferences?.preferredAssets || [],
    },
    lastInteraction: undefined, // Could track this
  };
}

/**
 * 🎯 Build AI context from user profile
 */
export async function buildUserContextForAI(userId: string): Promise<UserContextForAI> {
  const profile = await getUserProfile(userId);

  // Build context string for AI
  let contextParts: string[] = [];

  // Portfolio context
  if (profile.portfolio.length > 0) {
    const holdingsList = profile.portfolio
      .slice(0, 5)
      .map(h => `${h.symbol}${h.amount ? `: ${h.amount}` : ''}`)
      .join(', ');
    contextParts.push(`Holdings: ${holdingsList}`);
  }

  // Watchlist context
  if (profile.watchlist.length > 0) {
    const watchingList = profile.watchlist.slice(0, 5).map(w => w.symbol).join(', ');
    contextParts.push(`Watching: ${watchingList}`);
  }

  // Preferences context
  if (profile.preferences.riskTolerance) {
    contextParts.push(`Risk tolerance: ${profile.preferences.riskTolerance}`);
  }
  if (profile.preferences.tradingStyle) {
    contextParts.push(`Trading style: ${profile.preferences.tradingStyle}`);
  }
  if (profile.preferences.experienceLevel) {
    contextParts.push(`Experience: ${profile.preferences.experienceLevel}`);
  }
  if (profile.preferences.favoriteCoins && profile.preferences.favoriteCoins.length > 0) {
    contextParts.push(`Interested in: ${profile.preferences.favoriteCoins.join(', ')}`);
  }

  // Goals
  const goals = profile.memories.filter(m => m.category === 'goal');
  if (goals.length > 0) {
    contextParts.push(`Goals: ${goals.map(g => g.value).join('; ')}`);
  }

  // Insights AI has learned
  const insights = profile.memories.filter(m => m.category === 'insight');
  if (insights.length > 0) {
    contextParts.push(`Notes: ${insights.slice(0, 3).map(i => i.value).join('; ')}`);
  }

  const hasProfile = contextParts.length > 0;
  const contextString = hasProfile
    ? `\n[USER PROFILE]\n${contextParts.join('\n')}\n`
    : '';

  return {
    hasProfile,
    contextString,
    portfolio: {
      totalHoldings: profile.portfolio.length,
      topHoldings: profile.portfolio.slice(0, 5).map(h => h.symbol),
    },
    preferences: {
      riskTolerance: profile.preferences.riskTolerance,
      tradingStyle: profile.preferences.tradingStyle,
    },
    watchlist: profile.watchlist.map(w => w.symbol),
    recentTopics: [], // Could implement topic tracking
  };
}

// ============================================================================
// AUTO-EXTRACTION FROM CONVERSATIONS
// ============================================================================

/**
 * Extract memories from user message
 * Called automatically during chat to learn about user
 */
export async function extractMemoriesFromMessage(
  userId: string,
  message: string,
  aiResponse?: string
): Promise<void> {
  const lowerMessage = message.toLowerCase();

  try {
    // Extract risk tolerance
    if (lowerMessage.includes('conservative') || lowerMessage.includes('low risk')) {
      await storeMemory(userId, {
        category: 'preference',
        key: 'risk_tolerance',
        value: 'conservative',
        source: 'conversation',
        confidence: 0.8,
      });
    } else if (lowerMessage.includes('aggressive') || lowerMessage.includes('high risk')) {
      await storeMemory(userId, {
        category: 'preference',
        key: 'risk_tolerance',
        value: 'aggressive',
        source: 'conversation',
        confidence: 0.8,
      });
    } else if (lowerMessage.includes('moderate risk') || lowerMessage.includes('balanced')) {
      await storeMemory(userId, {
        category: 'preference',
        key: 'risk_tolerance',
        value: 'moderate',
        source: 'conversation',
        confidence: 0.8,
      });
    }

    // Extract experience level
    if (lowerMessage.includes('beginner') || lowerMessage.includes('new to crypto') || lowerMessage.includes('just started')) {
      await storeMemory(userId, {
        category: 'context',
        key: 'experience_level',
        value: 'beginner',
        source: 'conversation',
        confidence: 0.8,
      });
    } else if (lowerMessage.includes('experienced') || lowerMessage.includes('been trading for')) {
      await storeMemory(userId, {
        category: 'context',
        key: 'experience_level',
        value: 'experienced',
        source: 'conversation',
        confidence: 0.7,
      });
    }

    // Extract portfolio mentions ("I hold", "I have", "my position")
    const holdingPatterns = [
      /i (?:hold|have|own|bought)\s+(?:some\s+)?(\d+(?:\.\d+)?)\s*(?:of\s+)?(\w+)/gi,
      /my\s+(\w+)\s+(?:position|holdings?|bag)/gi,
      /holding\s+(\w+)/gi,
    ];

    for (const pattern of holdingPatterns) {
      const matches = message.matchAll(pattern);
      for (const match of matches) {
        const symbol = match[2] || match[1];
        if (symbol && symbol.length <= 10) {
          const upperSymbol = symbol.toUpperCase();
          // Verify it looks like a crypto symbol
          if (/^[A-Z]{2,10}$/.test(upperSymbol)) {
            await storeMemory(userId, {
              category: 'portfolio',
              key: `holds_${upperSymbol}`,
              value: upperSymbol,
              source: 'conversation',
              confidence: 0.7,
            });
          }
        }
      }
    }

    // Extract watchlist mentions ("watching", "interested in", "looking at")
    const watchPatterns = [
      /(?:watching|interested in|looking at|tracking)\s+(\w+)/gi,
      /keep(?:ing)?\s+(?:an\s+)?eye\s+on\s+(\w+)/gi,
    ];

    for (const pattern of watchPatterns) {
      const matches = message.matchAll(pattern);
      for (const match of matches) {
        const symbol = match[1];
        if (symbol && symbol.length <= 10) {
          const upperSymbol = symbol.toUpperCase();
          if (/^[A-Z]{2,10}$/.test(upperSymbol)) {
            await addToWatchlist(userId, { symbol: upperSymbol });
          }
        }
      }
    }

    // Extract trading style
    if (lowerMessage.includes('day trad') || lowerMessage.includes('scalp')) {
      await storeMemory(userId, {
        category: 'preference',
        key: 'trading_style',
        value: 'day trader',
        source: 'conversation',
        confidence: 0.7,
      });
    } else if (lowerMessage.includes('swing trad')) {
      await storeMemory(userId, {
        category: 'preference',
        key: 'trading_style',
        value: 'swing trader',
        source: 'conversation',
        confidence: 0.7,
      });
    } else if (lowerMessage.includes('hodl') || lowerMessage.includes('long term') || lowerMessage.includes('long-term')) {
      await storeMemory(userId, {
        category: 'preference',
        key: 'trading_style',
        value: 'long-term holder',
        source: 'conversation',
        confidence: 0.7,
      });
    }

    // Extract goals
    if (lowerMessage.includes('retire') || lowerMessage.includes('financial freedom')) {
      await storeMemory(userId, {
        category: 'goal',
        key: 'primary_goal',
        value: 'financial independence',
        source: 'conversation',
        confidence: 0.6,
      });
    } else if (lowerMessage.includes('quick profit') || lowerMessage.includes('short term gain')) {
      await storeMemory(userId, {
        category: 'goal',
        key: 'primary_goal',
        value: 'short-term profits',
        source: 'conversation',
        confidence: 0.6,
      });
    }

  } catch (error: any) {
    logger.debug('🧠 Memory extraction failed', { userId, error: error.message });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const memoryService = {
  // Memory operations
  store: storeMemory,
  get: getMemory,
  getByCategory: getMemoriesByCategory,
  getAll: getAllMemories,
  delete: deleteMemory,
  
  // Portfolio operations
  updatePortfolio,
  getPortfolio,
  removeFromPortfolio,
  
  // Watchlist operations
  addToWatchlist,
  getWatchlist,
  removeFromWatchlist,
  
  // Profile operations
  getProfile: getUserProfile,
  buildContext: buildUserContextForAI,
  
  // Auto-extraction
  extractFromMessage: extractMemoriesFromMessage,
};

export default memoryService;

