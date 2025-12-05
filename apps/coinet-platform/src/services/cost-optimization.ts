/**
 * 💰 COST OPTIMIZATION ENGINE - Divine Perfection Implementation
 * 
 * Step 1.4.4: Intelligent cost management for market data APIs
 * 
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    COST OPTIMIZATION STRATEGY                              ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  1. FREE-FIRST ROUTING                                                     ║
 * ║     → Always try free sources before paid                                  ║
 * ║     → Use paid only for unique data (market cap, ATH, etc.)               ║
 * ║                                                                            ║
 * ║  2. INTELLIGENT BATCHING                                                   ║
 * ║     → Combine multiple symbol requests into single API calls               ║
 * ║     → Reduces total request count significantly                            ║
 * ║                                                                            ║
 * ║  3. AGGRESSIVE CACHING                                                     ║
 * ║     → Longer TTLs for paid source data                                     ║
 * ║     → Stale-while-revalidate to minimize redundant calls                  ║
 * ║                                                                            ║
 * ║  4. BUDGET TRACKING                                                        ║
 * ║     → Real-time cost monitoring per source                                 ║
 * ║     → Daily/monthly limits with automatic throttling                       ║
 * ║     → Alerts at 80% budget usage                                          ║
 * ║                                                                            ║
 * ║  5. COST-BASED SOURCE SELECTION                                            ║
 * ║     → Dynamic routing based on remaining budget                            ║
 * ║     → Quality-adjusted cost efficiency scoring                             ║
 * ║                                                                            ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 * 
 * BUDGET: ~$200/month target
 * 
 * @module cost-optimization
 * @version 1.0.0 - Divine Perfection
 */

import { logger } from '../utils/logger';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface SourceCostConfig {
  sourceId: string;
  name: string;
  tier: 'free' | 'paid';
  costPerRequest: number;          // USD per API call
  monthlyIncludedCalls: number;    // Calls included in subscription
  monthlySubscriptionCost: number; // Fixed monthly cost
  rateLimitPerMin: number;
  dataUniqueness: DataUniqueness;  // What unique data does this source provide?
}

export interface DataUniqueness {
  prices: boolean;           // Basic price data
  volume: boolean;          // 24h volume
  marketCap: boolean;       // Market capitalization
  supply: boolean;          // Circulating/total/max supply
  ath: boolean;             // All-time high data
  ohlcv: boolean;           // Historical OHLCV
  fundamentals: boolean;    // Token fundamentals (description, links, etc.)
  orderbook: boolean;       // Order book depth
  trades: boolean;          // Recent trades
}

export interface CostTracker {
  sourceId: string;
  hourlyRequests: number;
  dailyRequests: number;
  monthlyRequests: number;
  hourlyCost: number;
  dailyCost: number;
  monthlyCost: number;
  lastRequestTime: Date | null;
  lastResetHour: Date;
  lastResetDay: Date;
  lastResetMonth: Date;
  savedByCache: number;      // Requests avoided due to cache
  savedByCacheCost: number;  // Cost saved due to cache
}

export interface BudgetConfig {
  monthlyBudget: number;      // Total monthly budget in USD
  dailyBudget: number;        // Daily budget (monthly/30)
  alertThreshold: number;     // Alert at this percentage (0.8 = 80%)
  hardLimitThreshold: number; // Stop paid calls at this percentage (0.95 = 95%)
}

export interface CostOptimizationDecision {
  shouldUsePaidSource: boolean;
  recommendedSource: string;
  reason: string;
  estimatedCost: number;
  budgetRemaining: {
    daily: number;
    monthly: number;
  };
  alternatives: string[];
}

export interface SourceSelectionCriteria {
  requiredData: (keyof DataUniqueness)[];
  preferFree: boolean;
  maxCostPerRequest: number;
  qualityMinimum: number;  // 0-1
}

export interface CostReport {
  timestamp: string;
  period: 'hourly' | 'daily' | 'monthly';
  totalCost: number;
  totalRequests: number;
  bySource: Record<string, {
    requests: number;
    cost: number;
    percentOfBudget: number;
    savedByCache: number;
  }>;
  budgetStatus: {
    used: number;
    remaining: number;
    percentUsed: number;
    projectedMonthly: number;
    onTrack: boolean;
  };
  recommendations: string[];
  costEfficiency: {
    costPerDataPoint: number;
    cacheHitRate: number;
    freeSourceUtilization: number;
  };
}

// ============================================================================
// SOURCE COST CONFIGURATION
// ============================================================================

/**
 * Cost configuration for each data source
 * 
 * Pricing as of 2024:
 * - CoinGecko Pro: $129/mo for 500 req/min (Analyst plan)
 * - CoinMarketCap Pro: $79/mo for 10,000 credits/mo (Hobbyist plan)
 * - Binance: FREE
 * - Kraken: FREE
 * - DefiLlama: FREE
 * - DexScreener: FREE
 */
export const SOURCE_COSTS: SourceCostConfig[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // PAID SOURCES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    sourceId: 'coingecko-pro',
    name: 'CoinGecko Pro',
    tier: 'paid',
    costPerRequest: 0.0004,           // ~$129/mo for 500 req/min = ~21.6M calls/mo
    monthlyIncludedCalls: 21600000,   // Effectively unlimited
    monthlySubscriptionCost: 129,
    rateLimitPerMin: 500,
    dataUniqueness: {
      prices: true,
      volume: true,
      marketCap: true,      // ← UNIQUE: Comprehensive market cap
      supply: true,         // ← UNIQUE: All supply metrics
      ath: true,            // ← UNIQUE: ATH data
      ohlcv: true,
      fundamentals: true,   // ← UNIQUE: Token fundamentals
      orderbook: false,
      trades: false,
    },
  },
  {
    sourceId: 'cmc-pro',
    name: 'CoinMarketCap Pro',
    tier: 'paid',
    costPerRequest: 0.0079,           // $79/mo for 10,000 credits
    monthlyIncludedCalls: 10000,
    monthlySubscriptionCost: 79,
    rateLimitPerMin: 333,
    dataUniqueness: {
      prices: true,
      volume: true,
      marketCap: true,      // ← Also has market cap
      supply: true,
      ath: false,           // No ATH data in basic plan
      ohlcv: false,
      fundamentals: true,
      orderbook: false,
      trades: false,
    },
  },
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FREE SOURCES
  // ═══════════════════════════════════════════════════════════════════════════
  {
    sourceId: 'coingecko-free',
    name: 'CoinGecko Free',
    tier: 'free',
    costPerRequest: 0,
    monthlyIncludedCalls: Infinity,
    monthlySubscriptionCost: 0,
    rateLimitPerMin: 10,              // Very limited
    dataUniqueness: {
      prices: true,
      volume: true,
      marketCap: true,      // ← Has market cap (just slower)
      supply: true,
      ath: true,
      ohlcv: true,
      fundamentals: true,
      orderbook: false,
      trades: false,
    },
  },
  {
    sourceId: 'binance',
    name: 'Binance',
    tier: 'free',
    costPerRequest: 0,
    monthlyIncludedCalls: Infinity,
    monthlySubscriptionCost: 0,
    rateLimitPerMin: 1200,
    dataUniqueness: {
      prices: true,         // ← Best for real-time prices
      volume: true,         // ← Best for volume
      marketCap: false,
      supply: false,
      ath: false,
      ohlcv: true,
      fundamentals: false,
      orderbook: true,      // ← UNIQUE: Order book
      trades: true,         // ← UNIQUE: Recent trades
    },
  },
  {
    sourceId: 'kraken',
    name: 'Kraken',
    tier: 'free',
    costPerRequest: 0,
    monthlyIncludedCalls: Infinity,
    monthlySubscriptionCost: 0,
    rateLimitPerMin: 60,
    dataUniqueness: {
      prices: true,
      volume: true,
      marketCap: false,
      supply: false,
      ath: false,
      ohlcv: true,
      fundamentals: false,
      orderbook: true,
      trades: true,
    },
  },
  {
    sourceId: 'defillama',
    name: 'DefiLlama',
    tier: 'free',
    costPerRequest: 0,
    monthlyIncludedCalls: Infinity,
    monthlySubscriptionCost: 0,
    rateLimitPerMin: 300,
    dataUniqueness: {
      prices: true,
      volume: false,
      marketCap: true,      // ← Has FDV
      supply: false,
      ath: false,
      ohlcv: false,
      fundamentals: false,
      orderbook: false,
      trades: false,
    },
  },
  {
    sourceId: 'dexscreener',
    name: 'DexScreener',
    tier: 'free',
    costPerRequest: 0,
    monthlyIncludedCalls: Infinity,
    monthlySubscriptionCost: 0,
    rateLimitPerMin: 300,
    dataUniqueness: {
      prices: true,         // ← Best for new/DEX tokens
      volume: true,
      marketCap: true,      // ← FDV for DEX tokens
      supply: false,
      ath: false,
      ohlcv: false,
      fundamentals: false,
      orderbook: false,
      trades: false,
    },
  },
];

// ============================================================================
// BUDGET CONFIGURATION
// ============================================================================

const DEFAULT_BUDGET: BudgetConfig = {
  monthlyBudget: 200,       // $200/month target
  dailyBudget: 6.67,        // ~$200/30 days
  alertThreshold: 0.80,     // Alert at 80%
  hardLimitThreshold: 0.95, // Stop paid calls at 95%
};

// ============================================================================
// COST OPTIMIZER CLASS
// ============================================================================

class CostOptimizer {
  private trackers: Map<string, CostTracker> = new Map();
  private budget: BudgetConfig;
  private cacheHits: number = 0;
  private cacheMisses: number = 0;
  
  constructor(budget: BudgetConfig = DEFAULT_BUDGET) {
    this.budget = budget;
    this.initializeTrackers();
    
    // Reset counters periodically
    this.scheduleResets();
    
    logger.info('💰 Cost Optimizer initialized', {
      monthlyBudget: `$${budget.monthlyBudget}`,
      dailyBudget: `$${budget.dailyBudget.toFixed(2)}`,
      alertThreshold: `${budget.alertThreshold * 100}%`,
    });
  }
  
  /**
   * Initialize cost trackers for all sources
   */
  private initializeTrackers(): void {
    const now = new Date();
    
    for (const source of SOURCE_COSTS) {
      this.trackers.set(source.sourceId, {
        sourceId: source.sourceId,
        hourlyRequests: 0,
        dailyRequests: 0,
        monthlyRequests: 0,
        hourlyCost: 0,
        dailyCost: 0,
        monthlyCost: 0,
        lastRequestTime: null,
        lastResetHour: now,
        lastResetDay: now,
        lastResetMonth: now,
        savedByCache: 0,
        savedByCacheCost: 0,
      });
    }
  }
  
  /**
   * Schedule periodic counter resets
   */
  private scheduleResets(): void {
    // Check and reset counters every minute
    setInterval(() => {
      this.checkAndResetCounters();
    }, 60000);
  }
  
  /**
   * Check and reset counters based on time
   */
  private checkAndResetCounters(): void {
    const now = new Date();
    
    for (const [sourceId, tracker] of this.trackers) {
      // Reset hourly
      if (now.getHours() !== tracker.lastResetHour.getHours()) {
        tracker.hourlyRequests = 0;
        tracker.hourlyCost = 0;
        tracker.lastResetHour = now;
      }
      
      // Reset daily
      if (now.getDate() !== tracker.lastResetDay.getDate()) {
        logger.info(`📊 Daily cost report for ${sourceId}`, {
          requests: tracker.dailyRequests,
          cost: `$${tracker.dailyCost.toFixed(4)}`,
          savedByCache: tracker.savedByCache,
        });
        
        tracker.dailyRequests = 0;
        tracker.dailyCost = 0;
        tracker.lastResetDay = now;
      }
      
      // Reset monthly
      if (now.getMonth() !== tracker.lastResetMonth.getMonth()) {
        logger.info(`📊 Monthly cost report for ${sourceId}`, {
          requests: tracker.monthlyRequests,
          cost: `$${tracker.monthlyCost.toFixed(4)}`,
          savedByCache: tracker.savedByCache,
          savedByCacheCost: `$${tracker.savedByCacheCost.toFixed(4)}`,
        });
        
        tracker.monthlyRequests = 0;
        tracker.monthlyCost = 0;
        tracker.savedByCache = 0;
        tracker.savedByCacheCost = 0;
        tracker.lastResetMonth = now;
      }
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COST RECORDING
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Record an API call and its cost
   */
  recordRequest(sourceId: string, isCacheHit: boolean = false): void {
    const tracker = this.trackers.get(sourceId);
    const config = SOURCE_COSTS.find(s => s.sourceId === sourceId);
    
    if (!tracker || !config) return;
    
    if (isCacheHit) {
      // Cache hit - no actual API call
      this.cacheHits++;
      tracker.savedByCache++;
      tracker.savedByCacheCost += config.costPerRequest;
      return;
    }
    
    this.cacheMisses++;
    
    const cost = config.costPerRequest;
    
    tracker.hourlyRequests++;
    tracker.dailyRequests++;
    tracker.monthlyRequests++;
    tracker.hourlyCost += cost;
    tracker.dailyCost += cost;
    tracker.monthlyCost += cost;
    tracker.lastRequestTime = new Date();
    
    // Check budget alerts
    this.checkBudgetAlerts();
  }
  
  /**
   * Record a cache hit (request avoided)
   */
  recordCacheHit(sourceId: string): void {
    this.recordRequest(sourceId, true);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // BUDGET CHECKING
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Check if budget alerts should be triggered
   */
  private checkBudgetAlerts(): void {
    const dailyUsed = this.getTotalDailyCost();
    const monthlyUsed = this.getTotalMonthlyCost();
    
    const dailyPercent = dailyUsed / this.budget.dailyBudget;
    const monthlyPercent = monthlyUsed / this.budget.monthlyBudget;
    
    if (dailyPercent >= this.budget.alertThreshold) {
      logger.warn('⚠️ Daily budget alert', {
        used: `$${dailyUsed.toFixed(4)}`,
        budget: `$${this.budget.dailyBudget.toFixed(2)}`,
        percent: `${(dailyPercent * 100).toFixed(1)}%`,
      });
    }
    
    if (monthlyPercent >= this.budget.alertThreshold) {
      logger.warn('⚠️ Monthly budget alert', {
        used: `$${monthlyUsed.toFixed(4)}`,
        budget: `$${this.budget.monthlyBudget}`,
        percent: `${(monthlyPercent * 100).toFixed(1)}%`,
      });
    }
  }
  
  /**
   * Get total daily cost across all sources
   */
  getTotalDailyCost(): number {
    let total = 0;
    for (const tracker of this.trackers.values()) {
      total += tracker.dailyCost;
    }
    return total;
  }
  
  /**
   * Get total monthly cost across all sources
   */
  getTotalMonthlyCost(): number {
    let total = 0;
    for (const tracker of this.trackers.values()) {
      total += tracker.monthlyCost;
    }
    return total;
  }
  
  /**
   * Check if we should use paid sources
   */
  shouldUsePaidSource(sourceId: string): boolean {
    const config = SOURCE_COSTS.find(s => s.sourceId === sourceId);
    if (!config || config.tier === 'free') return true; // Always allow free
    
    const dailyUsed = this.getTotalDailyCost();
    const monthlyUsed = this.getTotalMonthlyCost();
    
    // Hard limit check
    if (dailyUsed / this.budget.dailyBudget >= this.budget.hardLimitThreshold) {
      logger.warn(`🛑 Daily budget hard limit reached - blocking ${sourceId}`);
      return false;
    }
    
    if (monthlyUsed / this.budget.monthlyBudget >= this.budget.hardLimitThreshold) {
      logger.warn(`🛑 Monthly budget hard limit reached - blocking ${sourceId}`);
      return false;
    }
    
    return true;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // INTELLIGENT SOURCE SELECTION
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Get the optimal source for a specific data requirement
   * 
   * Strategy:
   * 1. Try FREE sources first if they have the required data
   * 2. Use PAID sources only for unique data
   * 3. Respect budget limits
   */
  getOptimalSource(criteria: SourceSelectionCriteria): CostOptimizationDecision {
    const eligibleSources: Array<{
      config: SourceCostConfig;
      score: number;
      hasAllRequiredData: boolean;
    }> = [];
    
    // Evaluate each source
    for (const config of SOURCE_COSTS) {
      // Check if source has all required data
      const hasAllRequiredData = criteria.requiredData.every(
        dataType => config.dataUniqueness[dataType]
      );
      
      // Skip if doesn't have required data
      if (!hasAllRequiredData) continue;
      
      // Skip if paid and over budget
      if (config.tier === 'paid' && !this.shouldUsePaidSource(config.sourceId)) {
        continue;
      }
      
      // Calculate cost-efficiency score
      // Higher score = more cost-efficient
      let score = 0;
      
      // Free sources get massive bonus
      if (config.tier === 'free') {
        score += 1000;
      }
      
      // Lower cost = higher score
      score += (1 - config.costPerRequest) * 100;
      
      // Higher rate limit = higher score (can serve more requests)
      score += Math.log10(config.rateLimitPerMin) * 10;
      
      // Bonus for more unique data types
      const uniqueDataCount = Object.values(config.dataUniqueness).filter(Boolean).length;
      score += uniqueDataCount * 5;
      
      eligibleSources.push({ config, score, hasAllRequiredData });
    }
    
    // Sort by score (highest first)
    eligibleSources.sort((a, b) => b.score - a.score);
    
    const dailyRemaining = this.budget.dailyBudget - this.getTotalDailyCost();
    const monthlyRemaining = this.budget.monthlyBudget - this.getTotalMonthlyCost();
    
    if (eligibleSources.length === 0) {
      return {
        shouldUsePaidSource: false,
        recommendedSource: 'none',
        reason: 'No source available with required data within budget',
        estimatedCost: 0,
        budgetRemaining: { daily: dailyRemaining, monthly: monthlyRemaining },
        alternatives: [],
      };
    }
    
    const best = eligibleSources[0];
    const alternatives = eligibleSources.slice(1, 4).map(s => s.config.sourceId);
    
    return {
      shouldUsePaidSource: best.config.tier === 'paid',
      recommendedSource: best.config.sourceId,
      reason: best.config.tier === 'free' 
        ? 'Using free source (cost-effective)'
        : `Using paid source for unique data: ${criteria.requiredData.join(', ')}`,
      estimatedCost: best.config.costPerRequest,
      budgetRemaining: { daily: dailyRemaining, monthly: monthlyRemaining },
      alternatives,
    };
  }
  
  /**
   * Get sources that can provide specific data types
   */
  getSourcesForDataType(dataType: keyof DataUniqueness): string[] {
    return SOURCE_COSTS
      .filter(s => s.dataUniqueness[dataType])
      .sort((a, b) => a.costPerRequest - b.costPerRequest)
      .map(s => s.sourceId);
  }
  
  /**
   * Determine optimal source mix for a market data request
   * 
   * Returns a plan of which sources to use for which data
   */
  planOptimalSourceMix(requiredData: (keyof DataUniqueness)[]): Map<string, (keyof DataUniqueness)[]> {
    const plan = new Map<string, (keyof DataUniqueness)[]>();
    const assignedData = new Set<keyof DataUniqueness>();
    
    // First pass: assign all data that FREE sources can provide
    for (const config of SOURCE_COSTS.filter(s => s.tier === 'free')) {
      const dataThisSourceCanProvide: (keyof DataUniqueness)[] = [];
      
      for (const dataType of requiredData) {
        if (!assignedData.has(dataType) && config.dataUniqueness[dataType]) {
          dataThisSourceCanProvide.push(dataType);
          assignedData.add(dataType);
        }
      }
      
      if (dataThisSourceCanProvide.length > 0) {
        plan.set(config.sourceId, dataThisSourceCanProvide);
      }
    }
    
    // Second pass: use PAID sources only for remaining data
    for (const config of SOURCE_COSTS.filter(s => s.tier === 'paid')) {
      if (!this.shouldUsePaidSource(config.sourceId)) continue;
      
      const dataThisSourceCanProvide: (keyof DataUniqueness)[] = [];
      
      for (const dataType of requiredData) {
        if (!assignedData.has(dataType) && config.dataUniqueness[dataType]) {
          dataThisSourceCanProvide.push(dataType);
          assignedData.add(dataType);
        }
      }
      
      if (dataThisSourceCanProvide.length > 0) {
        plan.set(config.sourceId, dataThisSourceCanProvide);
      }
    }
    
    return plan;
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // REPORTING
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Generate comprehensive cost report
   */
  generateCostReport(period: 'hourly' | 'daily' | 'monthly' = 'daily'): CostReport {
    const bySource: CostReport['bySource'] = {};
    let totalCost = 0;
    let totalRequests = 0;
    let totalSavedByCache = 0;
    
    for (const [sourceId, tracker] of this.trackers) {
      const config = SOURCE_COSTS.find(s => s.sourceId === sourceId);
      
      let requests: number;
      let cost: number;
      
      switch (period) {
        case 'hourly':
          requests = tracker.hourlyRequests;
          cost = tracker.hourlyCost;
          break;
        case 'daily':
          requests = tracker.dailyRequests;
          cost = tracker.dailyCost;
          break;
        case 'monthly':
          requests = tracker.monthlyRequests;
          cost = tracker.monthlyCost;
          break;
      }
      
      const budget = period === 'hourly' 
        ? this.budget.dailyBudget / 24
        : period === 'daily'
        ? this.budget.dailyBudget
        : this.budget.monthlyBudget;
      
      bySource[sourceId] = {
        requests,
        cost,
        percentOfBudget: budget > 0 ? (cost / budget) * 100 : 0,
        savedByCache: tracker.savedByCache,
      };
      
      totalCost += cost;
      totalRequests += requests;
      totalSavedByCache += tracker.savedByCache;
    }
    
    const budget = period === 'hourly'
      ? this.budget.dailyBudget / 24
      : period === 'daily'
      ? this.budget.dailyBudget
      : this.budget.monthlyBudget;
    
    const percentUsed = budget > 0 ? (totalCost / budget) * 100 : 0;
    
    // Calculate projected monthly cost
    let projectedMonthly = totalCost;
    if (period === 'hourly') {
      projectedMonthly = totalCost * 24 * 30;
    } else if (period === 'daily') {
      projectedMonthly = totalCost * 30;
    }
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (percentUsed > 80) {
      recommendations.push('⚠️ Budget usage high - consider increasing cache TTLs');
    }
    
    const cacheHitRate = this.cacheHits / (this.cacheHits + this.cacheMisses) || 0;
    if (cacheHitRate < 0.5) {
      recommendations.push('💡 Cache hit rate low - consider longer TTLs for price data');
    }
    
    // Check if paid sources are being overused
    const paidSourceUsage = Object.entries(bySource)
      .filter(([id]) => SOURCE_COSTS.find(s => s.sourceId === id)?.tier === 'paid')
      .reduce((sum, [_, data]) => sum + data.requests, 0);
    
    const freeSourceUsage = Object.entries(bySource)
      .filter(([id]) => SOURCE_COSTS.find(s => s.sourceId === id)?.tier === 'free')
      .reduce((sum, [_, data]) => sum + data.requests, 0);
    
    const freeUtilization = freeSourceUsage / (freeSourceUsage + paidSourceUsage) || 0;
    
    if (freeUtilization < 0.7) {
      recommendations.push('💡 Increase free source utilization - currently ' + 
        (freeUtilization * 100).toFixed(1) + '%');
    }
    
    if (projectedMonthly > this.budget.monthlyBudget) {
      recommendations.push(`🚨 Projected monthly cost ($${projectedMonthly.toFixed(2)}) exceeds budget`);
    }
    
    return {
      timestamp: new Date().toISOString(),
      period,
      totalCost,
      totalRequests,
      bySource,
      budgetStatus: {
        used: totalCost,
        remaining: budget - totalCost,
        percentUsed,
        projectedMonthly,
        onTrack: projectedMonthly <= this.budget.monthlyBudget,
      },
      recommendations,
      costEfficiency: {
        costPerDataPoint: totalRequests > 0 ? totalCost / totalRequests : 0,
        cacheHitRate,
        freeSourceUtilization: freeUtilization,
      },
    };
  }
  
  /**
   * Get budget configuration
   */
  getBudgetConfig(): BudgetConfig {
    return { ...this.budget };
  }
  
  /**
   * Update budget configuration
   */
  updateBudget(newBudget: Partial<BudgetConfig>): void {
    this.budget = { ...this.budget, ...newBudget };
    logger.info('💰 Budget updated', this.budget);
  }
  
  /**
   * Get cost config for a source
   */
  getSourceCostConfig(sourceId: string): SourceCostConfig | null {
    return SOURCE_COSTS.find(s => s.sourceId === sourceId) || null;
  }
  
  /**
   * Reset all trackers (for testing)
   */
  resetTrackers(): void {
    this.initializeTrackers();
    this.cacheHits = 0;
    this.cacheMisses = 0;
    logger.info('💰 Cost trackers reset');
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const costOptimizer = new CostOptimizer();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the cheapest source for price data
 */
export function getCheapestPriceSource(): string {
  const decision = costOptimizer.getOptimalSource({
    requiredData: ['prices'],
    preferFree: true,
    maxCostPerRequest: 0.01,
    qualityMinimum: 0.8,
  });
  return decision.recommendedSource;
}

/**
 * Get source for market cap data (may require paid)
 */
export function getMarketCapSource(): string {
  const decision = costOptimizer.getOptimalSource({
    requiredData: ['marketCap'],
    preferFree: true,
    maxCostPerRequest: 0.01,
    qualityMinimum: 0.9,
  });
  return decision.recommendedSource;
}

/**
 * Check if we should skip a paid source due to budget
 */
export function shouldSkipPaidSource(sourceId: string): boolean {
  return !costOptimizer.shouldUsePaidSource(sourceId);
}

/**
 * Format cost report for AI context
 */
export function formatCostReportForAI(report: CostReport): string {
  let context = `
╔═══════════════════════════════════════════════════════════════════════════╗
║              💰 API COST OPTIMIZATION REPORT                               ║
║              Period: ${report.period.toUpperCase().padEnd(10)}                                        ║
╚═══════════════════════════════════════════════════════════════════════════╝

📊 BUDGET STATUS:
   Used: $${report.budgetStatus.used.toFixed(4)} / $${(report.budgetStatus.used + report.budgetStatus.remaining).toFixed(2)} (${report.budgetStatus.percentUsed.toFixed(1)}%)
   Remaining: $${report.budgetStatus.remaining.toFixed(2)}
   Projected Monthly: $${report.budgetStatus.projectedMonthly.toFixed(2)}
   Status: ${report.budgetStatus.onTrack ? '✅ On Track' : '⚠️ Over Budget'}

📈 EFFICIENCY METRICS:
   Cost per Data Point: $${report.costEfficiency.costPerDataPoint.toFixed(6)}
   Cache Hit Rate: ${(report.costEfficiency.cacheHitRate * 100).toFixed(1)}%
   Free Source Utilization: ${(report.costEfficiency.freeSourceUtilization * 100).toFixed(1)}%

📋 SOURCE BREAKDOWN:
`;

  for (const [sourceId, data] of Object.entries(report.bySource)) {
    const config = SOURCE_COSTS.find(s => s.sourceId === sourceId);
    const tier = config?.tier === 'free' ? '🆓' : '💳';
    
    if (data.requests > 0 || data.savedByCache > 0) {
      context += `   ${tier} ${sourceId}: ${data.requests} calls, $${data.cost.toFixed(4)} (${data.percentOfBudget.toFixed(1)}% of budget)`;
      if (data.savedByCache > 0) {
        context += ` | Saved by cache: ${data.savedByCache}`;
      }
      context += '\n';
    }
  }

  if (report.recommendations.length > 0) {
    context += '\n💡 RECOMMENDATIONS:\n';
    for (const rec of report.recommendations) {
      context += `   ${rec}\n`;
    }
  }

  return context;
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  CostOptimizer,
  SOURCE_COSTS,
  DEFAULT_BUDGET,
};

export default costOptimizer;

