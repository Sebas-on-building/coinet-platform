/**
 * =========================================
 * MULTI-DIMENSIONAL CACHE STRATEGY
 * =========================================
 * Multi-factor caching that considers:
 * 1. Popularity (request frequency)
 * 2. Volatility (price change rate)
 * 3. Temporal (time of day/week)
 * 4. User behavior (personal patterns)
 * 5. Market condition (bull/bear/neutral)
 * 6. Liquidity (trading volume)
 * 7. Correlation (related tokens)
 * 
 * Targets high cache hit ratios through intelligent prefetching
 */

import { EventEmitter } from 'eventemitter3';
import { logger } from '../../utils/logger';

/**
 * Cache dimension weights
 */
export interface CacheDimensionWeights {
  popularity: number; // 0-1
  volatility: number; // 0-1
  temporal: number; // 0-1
  userBehavior: number; // 0-1
  marketCondition: number; // 0-1
  liquidity: number; // 0-1
  correlation: number; // 0-1
}

/**
 * Cache score result
 */
export interface CacheScore {
  token: string;
  overallScore: number; // 0-1 (1 = highest priority)
  dimensions: CacheDimensionWeights;
  recommendedTTL: number; // seconds
  recommendedPriority: 'P0' | 'P1' | 'P2' | 'P3';
  shouldPrefetch: boolean;
  estimatedHitProbability: number;
  metadata: {
    requestsLast24h: number;
    priceVolatility: number;
    correlatedTokens: string[];
    peakHour: number;
  };
}

/**
 * Token metrics for scoring
 */
export interface TokenMetrics {
  requestsLast1h: number;
  requestsLast24h: number;
  priceChange1h: number; // Percentage
  priceChange24h: number; // Percentage
  volume24h: number;
  marketCap: number;
  lastRequested: Date;
  correlatedTokens: string[];
}

/**
 * Multi-Dimensional Cache Strategy
 */
export class MultiDimensionalCache extends EventEmitter {
  private tokenMetrics: Map<string, TokenMetrics> = new Map();
  private tokenScores: Map<string, CacheScore> = new Map();
  private correlationMatrix: Map<string, Map<string, number>> = new Map();
  private hourlyHeatmap: Map<number, Map<string, number>> = new Map();

  // Default dimension weights (optimized for crypto markets)
  private defaultWeights: CacheDimensionWeights = {
    popularity: 0.25, // High weight - frequently requested = cache
    volatility: 0.20, // High weight - volatile = shorter TTL but cache
    temporal: 0.15, // Medium weight - time patterns matter
    userBehavior: 0.15, // Medium weight - personal patterns
    marketCondition: 0.10, // Lower weight - market mood
    liquidity: 0.10, // Lower weight - volume matters
    correlation: 0.05, // Low weight - related tokens
  };

  constructor() {
    super();

    // Initialize hourly heatmap
    for (let hour = 0; hour < 24; hour++) {
      this.hourlyHeatmap.set(hour, new Map());
    }

    logger.info('Multi-Dimensional Cache initialized');
  }

  /**
   * Calculate comprehensive cache score for token
   */
  calculateCacheScore(
    token: string,
    marketCondition: 'bull' | 'bear' | 'neutral' = 'neutral',
    userId?: string
  ): CacheScore {
    // Check if score is cached (scores expire every 60 seconds)
    const cached = this.tokenScores.get(token);
    if (cached && Date.now() - cached.metadata.requestsLast24h < 60000) {
      return cached;
    }

    const metrics = this.tokenMetrics.get(token) || this.createDefaultMetrics();

    // Calculate each dimension score (0-1)
    const dimensions: CacheDimensionWeights = {
      popularity: this.calculatePopularityScore(metrics),
      volatility: this.calculateVolatilityScore(metrics),
      temporal: this.calculateTemporalScore(token),
      userBehavior: userId ? this.calculateUserBehaviorScore(token, userId) : 0.5,
      marketCondition: this.calculateMarketConditionScore(marketCondition),
      liquidity: this.calculateLiquidityScore(metrics),
      correlation: this.calculateCorrelationScore(token),
    };

    // Weighted combination
    const overallScore =
      dimensions.popularity * this.defaultWeights.popularity +
      dimensions.volatility * this.defaultWeights.volatility +
      dimensions.temporal * this.defaultWeights.temporal +
      dimensions.userBehavior * this.defaultWeights.userBehavior +
      dimensions.marketCondition * this.defaultWeights.marketCondition +
      dimensions.liquidity * this.defaultWeights.liquidity +
      dimensions.correlation * this.defaultWeights.correlation;

    // Determine TTL based on volatility and popularity
    let recommendedTTL: number;
    if (dimensions.volatility > 0.8) {
      recommendedTTL = 3; // Extreme volatility: 3s
    } else if (dimensions.volatility > 0.6) {
      recommendedTTL = 5; // High volatility: 5s
    } else if (dimensions.popularity > 0.7) {
      recommendedTTL = 10; // Popular: 10s
    } else if (dimensions.popularity > 0.4) {
      recommendedTTL = 30; // Medium: 30s
    } else {
      recommendedTTL = 60; // Low popularity: 60s
    }

    // Determine priority
    let recommendedPriority: 'P0' | 'P1' | 'P2' | 'P3';
    if (overallScore > 0.8) recommendedPriority = 'P0';
    else if (overallScore > 0.6) recommendedPriority = 'P1';
    else if (overallScore > 0.4) recommendedPriority = 'P2';
    else recommendedPriority = 'P3';

    // Should prefetch if score > 0.5
    const shouldPrefetch = overallScore > 0.5;

    // Estimate hit probability based on score
    const estimatedHitProbability = overallScore * 0.95;

    const score: CacheScore = {
      token,
      overallScore,
      dimensions,
      recommendedTTL,
      recommendedPriority,
      shouldPrefetch,
      estimatedHitProbability,
      metadata: {
        requestsLast24h: metrics.requestsLast24h,
        priceVolatility: Math.abs(metrics.priceChange24h),
        correlatedTokens: metrics.correlatedTokens,
        peakHour: this.getPeakHour(token),
      },
    };

    this.tokenScores.set(token, score);
    return score;
  }

  /**
   * Calculate popularity score (0-1)
   */
  private calculatePopularityScore(metrics: TokenMetrics): number {
    // Exponential scoring based on request frequency
    const requestsLast1h = metrics.requestsLast1h;
    const requestsLast24h = metrics.requestsLast24h;

    // Recent requests matter more
    const recentScore = Math.min(requestsLast1h / 100, 1); // Max at 100 req/h
    const dailyScore = Math.min(requestsLast24h / 1000, 1); // Max at 1000 req/day

    return recentScore * 0.7 + dailyScore * 0.3;
  }

  /**
   * Calculate volatility score (0-1)
   */
  private calculateVolatilityScore(metrics: TokenMetrics): number {
    // Higher volatility = higher score (needs fresh data)
    const volatility1h = Math.abs(metrics.priceChange1h);
    const volatility24h = Math.abs(metrics.priceChange24h);

    const score1h = Math.min(volatility1h / 10, 1); // 10% change = max score
    const score24h = Math.min(volatility24h / 20, 1); // 20% change = max score

    return score1h * 0.6 + score24h * 0.4;
  }

  /**
   * Calculate temporal score (time-based patterns)
   */
  private calculateTemporalScore(token: string): number {
    const currentHour = new Date().getHours();
    const hourMap = this.hourlyHeatmap.get(currentHour);

    if (!hourMap) return 0.5;

    const requestsThisHour = hourMap.get(token) || 0;
    const maxRequestsThisHour = Math.max(...Array.from(hourMap.values()));

    return maxRequestsThisHour > 0 ? requestsThisHour / maxRequestsThisHour : 0.5;
  }

  /**
   * Calculate user behavior score
   */
  private calculateUserBehaviorScore(token: string, userId: string): number {
    // Simplified - would integrate with user behavior analytics
    return 0.5;
  }

  /**
   * Calculate market condition score
   */
  private calculateMarketConditionScore(
    condition: 'bull' | 'bear' | 'neutral'
  ): number {
    // Bull market = more trading = higher scores
    if (condition === 'bull') return 0.8;
    if (condition === 'bear') return 0.7;
    return 0.6;
  }

  /**
   * Calculate liquidity score
   */
  private calculateLiquidityScore(metrics: TokenMetrics): number {
    // Higher volume = more liquid = more important to cache
    const volumeScore = Math.min(Math.log10(metrics.volume24h + 1) / 9, 1); // Log scale, max at $1B
    const marketCapScore = Math.min(Math.log10(metrics.marketCap + 1) / 11, 1); // Log scale, max at $100B

    return volumeScore * 0.6 + marketCapScore * 0.4;
  }

  /**
   * Calculate correlation score (related tokens)
   */
  private calculateCorrelationScore(token: string): number {
    const correlations = this.correlationMatrix.get(token);
    if (!correlations || correlations.size === 0) return 0.5;

    // High correlation with popular tokens = higher score
    const avgCorrelation =
      Array.from(correlations.values()).reduce((sum, corr) => sum + corr, 0) /
      correlations.size;

    return avgCorrelation;
  }

  /**
   * Update token metrics
   */
  updateMetrics(token: string, metrics: Partial<TokenMetrics>): void {
    const existing = this.tokenMetrics.get(token) || this.createDefaultMetrics();

    this.tokenMetrics.set(token, {
      ...existing,
      ...metrics,
      lastRequested: new Date(),
    });

    // Update hourly heatmap
    const currentHour = new Date().getHours();
    const hourMap = this.hourlyHeatmap.get(currentHour)!;
    hourMap.set(token, (hourMap.get(token) || 0) + 1);

    // Invalidate score cache
    this.tokenScores.delete(token);
  }

  /**
   * Learn token correlation
   */
  learnCorrelation(token1: string, token2: string, weight: number = 1): void {
    if (!this.correlationMatrix.has(token1)) {
      this.correlationMatrix.set(token1, new Map());
    }
    if (!this.correlationMatrix.has(token2)) {
      this.correlationMatrix.set(token2, new Map());
    }

    const matrix1 = this.correlationMatrix.get(token1)!;
    const matrix2 = this.correlationMatrix.get(token2)!;

    // Increase correlation (with decay)
    const current1 = matrix1.get(token2) || 0;
    const current2 = matrix2.get(token1) || 0;

    matrix1.set(token2, Math.min((current1 + weight) * 0.95, 1));
    matrix2.set(token1, Math.min((current2 + weight) * 0.95, 1));
  }

  /**
   * Get peak hour for token
   */
  private getPeakHour(token: string): number {
    let peakHour = 0;
    let maxRequests = 0;

    this.hourlyHeatmap.forEach((hourMap, hour) => {
      const requests = hourMap.get(token) || 0;
      if (requests > maxRequests) {
        maxRequests = requests;
        peakHour = hour;
      }
    });

    return peakHour;
  }

  /**
   * Create default metrics
   */
  private createDefaultMetrics(): TokenMetrics {
    return {
      requestsLast1h: 0,
      requestsLast24h: 0,
      priceChange1h: 0,
      priceChange24h: 0,
      volume24h: 0,
      marketCap: 0,
      lastRequested: new Date(),
      correlatedTokens: [],
    };
  }

  /**
   * Get top tokens to prefetch
   */
  getTopPrefetchCandidates(
    limit: number = 100,
    marketCondition: 'bull' | 'bear' | 'neutral' = 'neutral'
  ): Array<{ token: string; score: CacheScore }> {
    const allTokens = Array.from(this.tokenMetrics.keys());

    const scored = allTokens
      .map((token) => ({
        token,
        score: this.calculateCacheScore(token, marketCondition),
      }))
      .filter((s) => s.score.shouldPrefetch)
      .sort((a, b) => b.score.overallScore - a.score.overallScore)
      .slice(0, limit);

    return scored;
  }

  /**
   * Cleanup old metrics (retention policy)
   */
  cleanup(): void {
    const now = Date.now();
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

    let cleanedCount = 0;
    this.tokenMetrics.forEach((metrics, token) => {
      if (now - metrics.lastRequested.getTime() > maxAge) {
        this.tokenMetrics.delete(token);
        this.tokenScores.delete(token);
        this.correlationMatrix.delete(token);
        cleanedCount++;
      }
    });

    logger.debug('Cleaned up old token metrics', { cleanedCount });
  }
}

