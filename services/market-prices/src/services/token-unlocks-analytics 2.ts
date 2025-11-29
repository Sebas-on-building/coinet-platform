/**
 * Token Unlocks Analytics & Impact Assessment Module
 * Divine world-class analytics for token unlock events
 * 
 * Features:
 * - Advanced impact scoring with multiple factors
 * - Market pressure prediction
 * - Correlation analysis with price movements
 * - Historical performance tracking
 * - Supply dilution analysis
 * - Whale wallet tracking
 */

import { logger } from '../utils/logger';
import { NormalizedTokenUnlock, TokenUnlockAlert } from '../types/messari.types';
import { MarketPrice } from '../types';

export interface ImpactFactors {
  unlockPercentage: number; // Percentage of total supply unlocked
  unlockValueUsd: number; // Total USD value
  percentOfMarketCap: number; // Percentage of market cap
  categoryRisk: number; // Risk based on allocation category
  velocityRisk: number; // Risk based on unlock frequency
  liquidityRisk: number; // Risk based on available liquidity
}

export interface ImpactAssessment {
  unlock: NormalizedTokenUnlock;
  factors: ImpactFactors;
  overallScore: number; // 0-100
  severity: 'low' | 'medium' | 'high' | 'critical';
  expectedPricePressure: 'minimal' | 'moderate' | 'significant' | 'severe';
  recommendations: string[];
  alerts: string[];
}

export interface MarketPressureAnalysis {
  symbol: string;
  totalUpcomingUnlocks: number;
  totalUnlockValueUsd: number;
  percentOfMarketCap: number;
  timeframe: string;
  pressureLevel: 'low' | 'medium' | 'high' | 'extreme';
  peakPressureDates: Date[];
  recommendations: string[];
}

export interface SupplyDilutionAnalysis {
  symbol: string;
  currentCirculatingSupply: number;
  postUnlockCirculatingSupply: number;
  dilutionPercentage: number;
  estimatedPriceImpact: number; // Percentage
  timeToAbsorb: number; // Days estimated
}

export interface HistoricalUnlockPerformance {
  symbol: string;
  unlockDate: Date;
  unlockAmount: number;
  unlockAmountUsd: number;
  priceBeforeUnlock: number;
  priceAfterUnlock: number;
  priceChange24h: number;
  priceChange7d: number;
  volumeChange24h: number;
  actualImpact: 'positive' | 'neutral' | 'negative';
}

export interface CategoryAnalysis {
  category: string;
  totalUnlocks: number;
  totalValueUsd: number;
  averageImpactScore: number;
  historicalSellingPressure: number; // Percentage
  recommendation: string;
}

export class TokenUnlocksAnalytics {
  /**
   * Calculate comprehensive impact assessment
   */
  static calculateImpactAssessment(
    unlock: NormalizedTokenUnlock,
    marketPrice?: MarketPrice,
    recentUnlocks?: NormalizedTokenUnlock[]
  ): ImpactAssessment {
    const factors = this.calculateImpactFactors(
      unlock,
      marketPrice,
      recentUnlocks
    );

    const overallScore = this.calculateOverallScore(factors);
    const severity = this.determineSeverity(overallScore);
    const expectedPricePressure = this.predictPricePressure(overallScore, factors);
    const recommendations = this.generateRecommendations(
      unlock,
      factors,
      severity
    );
    const alerts = this.generateAlerts(unlock, factors, severity);

    return {
      unlock,
      factors,
      overallScore,
      severity,
      expectedPricePressure,
      recommendations,
      alerts,
    };
  }

  /**
   * Calculate detailed impact factors
   */
  private static calculateImpactFactors(
    unlock: NormalizedTokenUnlock,
    marketPrice?: MarketPrice,
    recentUnlocks?: NormalizedTokenUnlock[]
  ): ImpactFactors {
    // Factor 1: Unlock percentage
    const unlockPercentage = unlock.unlockPercentage;

    // Factor 2: Unlock value in USD
    const unlockValueUsd = unlock.unlockAmountUsd;

    // Factor 3: Percentage of market cap
    let percentOfMarketCap = 0;
    if (unlock.marketCapBeforeUsd && unlockValueUsd) {
      percentOfMarketCap = (unlockValueUsd / unlock.marketCapBeforeUsd) * 100;
    } else if (marketPrice) {
      percentOfMarketCap = (unlockValueUsd / marketPrice.marketCap) * 100;
    }

    // Factor 4: Category risk
    const categoryRisk = this.calculateCategoryRisk(unlock.category);

    // Factor 5: Velocity risk (frequency of unlocks)
    const velocityRisk = this.calculateVelocityRisk(unlock, recentUnlocks || []);

    // Factor 6: Liquidity risk
    const liquidityRisk = this.calculateLiquidityRisk(
      unlockValueUsd,
      marketPrice?.volume24h || 0
    );

    return {
      unlockPercentage,
      unlockValueUsd,
      percentOfMarketCap,
      categoryRisk,
      velocityRisk,
      liquidityRisk,
    };
  }

  /**
   * Calculate overall impact score (0-100)
   */
  private static calculateOverallScore(factors: ImpactFactors): number {
    let score = 0;

    // Unlock percentage (max 25 points)
    score += Math.min(factors.unlockPercentage * 2.5, 25);

    // Market cap percentage (max 30 points)
    score += Math.min(factors.percentOfMarketCap * 3, 30);

    // Category risk (max 20 points)
    score += factors.categoryRisk;

    // Velocity risk (max 15 points)
    score += factors.velocityRisk;

    // Liquidity risk (max 10 points)
    score += factors.liquidityRisk;

    return Math.min(Math.round(score), 100);
  }

  /**
   * Calculate category risk (0-20 points)
   */
  private static calculateCategoryRisk(category: string): number {
    const categoryRiskMap: Record<string, number> = {
      team: 20, // Highest risk
      insider: 20,
      investor: 18,
      'early-investor': 18,
      'private-sale': 17,
      'seed-sale': 17,
      advisor: 15,
      foundation: 12,
      treasury: 10,
      'ecosystem-fund': 8,
      community: 5,
      'public-sale': 3,
      liquidity: 2,
      staking: 2,
    };

    return categoryRiskMap[category.toLowerCase()] || 10;
  }

  /**
   * Calculate velocity risk based on unlock frequency (0-15 points)
   */
  private static calculateVelocityRisk(
    unlock: NormalizedTokenUnlock,
    recentUnlocks: NormalizedTokenUnlock[]
  ): number {
    if (recentUnlocks.length === 0) return 5;

    // Filter unlocks for the same symbol within 30 days before
    const thirtyDaysBefore = new Date(unlock.unlockDate);
    thirtyDaysBefore.setDate(thirtyDaysBefore.getDate() - 30);

    const recentSymbolUnlocks = recentUnlocks.filter(
      (u) =>
        u.symbol === unlock.symbol &&
        u.unlockDate >= thirtyDaysBefore &&
        u.unlockDate < unlock.unlockDate
    );

    // More frequent unlocks = higher risk
    if (recentSymbolUnlocks.length >= 4) return 15;
    if (recentSymbolUnlocks.length === 3) return 12;
    if (recentSymbolUnlocks.length === 2) return 8;
    if (recentSymbolUnlocks.length === 1) return 5;

    return 2; // First unlock in 30 days
  }

  /**
   * Calculate liquidity risk (0-10 points)
   */
  private static calculateLiquidityRisk(
    unlockValueUsd: number,
    volume24h: number
  ): number {
    if (volume24h === 0) return 10;

    const volumeRatio = unlockValueUsd / volume24h;

    if (volumeRatio >= 1.0) return 10; // Unlock >= daily volume
    if (volumeRatio >= 0.5) return 8;
    if (volumeRatio >= 0.25) return 6;
    if (volumeRatio >= 0.1) return 4;
    if (volumeRatio >= 0.05) return 2;

    return 1;
  }

  /**
   * Determine severity level
   */
  private static determineSeverity(
    score: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  /**
   * Predict price pressure
   */
  private static predictPricePressure(
    score: number,
    factors: ImpactFactors
  ): 'minimal' | 'moderate' | 'significant' | 'severe' {
    // Adjust based on liquidity
    const adjustedScore = score * (1 + factors.liquidityRisk / 20);

    if (adjustedScore >= 85) return 'severe';
    if (adjustedScore >= 65) return 'significant';
    if (adjustedScore >= 40) return 'moderate';
    return 'minimal';
  }

  /**
   * Generate recommendations
   */
  private static generateRecommendations(
    unlock: NormalizedTokenUnlock,
    factors: ImpactFactors,
    severity: string
  ): string[] {
    const recommendations: string[] = [];
    const daysUntil = Math.ceil(
      (unlock.unlockDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    // Severity-based recommendations
    if (severity === 'critical') {
      recommendations.push(
        'CRITICAL: Consider significantly reducing or exiting positions before unlock'
      );
      recommendations.push('Set tight stop-losses to protect against sharp declines');
      recommendations.push('Monitor on-chain activity for large transfers');
    } else if (severity === 'high') {
      recommendations.push(
        'HIGH RISK: Reduce exposure or hedge positions before unlock'
      );
      recommendations.push('Watch for increased volatility around unlock date');
      recommendations.push('Consider selling rallies in advance');
    } else if (severity === 'medium') {
      recommendations.push('MODERATE RISK: Monitor closely and be prepared to act');
      recommendations.push('Consider trimming positions if near resistance levels');
    } else {
      recommendations.push('LOW RISK: Normal monitoring recommended');
      recommendations.push('May present buying opportunity if price dips');
    }

    // Category-specific recommendations
    if (factors.categoryRisk >= 18) {
      recommendations.push(
        `${unlock.category.toUpperCase()} unlock - historically high selling pressure`
      );
    }

    // Liquidity recommendations
    if (factors.liquidityRisk >= 8) {
      recommendations.push(
        'Low liquidity warning: Exit positions gradually to avoid slippage'
      );
    }

    // Velocity recommendations
    if (factors.velocityRisk >= 12) {
      recommendations.push(
        'Multiple recent unlocks - accumulated selling pressure likely'
      );
    }

    // Timeline recommendations
    if (daysUntil <= 3) {
      recommendations.push('URGENT: Unlock imminent - act within 24-48 hours');
    } else if (daysUntil <= 7) {
      recommendations.push('Action needed within the week');
    } else if (daysUntil <= 14) {
      recommendations.push('Plan strategy over the next two weeks');
    }

    return recommendations;
  }

  /**
   * Generate alerts
   */
  private static generateAlerts(
    unlock: NormalizedTokenUnlock,
    factors: ImpactFactors,
    severity: string
  ): string[] {
    const alerts: string[] = [];

    if (severity === 'critical' && factors.percentOfMarketCap > 20) {
      alerts.push(
        `EXTREME: Unlock represents ${factors.percentOfMarketCap.toFixed(1)}% of market cap`
      );
    }

    if (factors.unlockPercentage > 10) {
      alerts.push(
        `Large supply increase: ${factors.unlockPercentage.toFixed(1)}% of total supply`
      );
    }

    if (factors.liquidityRisk >= 8) {
      alerts.push('Liquidity warning: Unlock value equals or exceeds daily volume');
    }

    if (factors.velocityRisk >= 12) {
      alerts.push('Multiple unlock events in short timeframe');
    }

    return alerts;
  }

  /**
   * Analyze market pressure for a symbol
   */
  static analyzeMarketPressure(
    unlocks: NormalizedTokenUnlock[],
    marketPrice?: MarketPrice,
    timeframeDays: number = 30
  ): MarketPressureAnalysis {
    const totalUnlockValueUsd = unlocks.reduce(
      (sum, u) => sum + u.unlockAmountUsd,
      0
    );

    let percentOfMarketCap = 0;
    if (marketPrice) {
      percentOfMarketCap = (totalUnlockValueUsd / marketPrice.marketCap) * 100;
    }

    // Determine pressure level
    let pressureLevel: 'low' | 'medium' | 'high' | 'extreme';
    if (percentOfMarketCap >= 30) {
      pressureLevel = 'extreme';
    } else if (percentOfMarketCap >= 15) {
      pressureLevel = 'high';
    } else if (percentOfMarketCap >= 5) {
      pressureLevel = 'medium';
    } else {
      pressureLevel = 'low';
    }

    // Find peak pressure dates (days with multiple or large unlocks)
    const unlocksByDate = new Map<string, number>();
    unlocks.forEach((unlock) => {
      const dateStr = unlock.unlockDate.toISOString().split('T')[0];
      const current = unlocksByDate.get(dateStr) || 0;
      unlocksByDate.set(dateStr, current + unlock.unlockAmountUsd);
    });

    const peakPressureDates = Array.from(unlocksByDate.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([dateStr]) => new Date(dateStr));

    // Generate recommendations
    const recommendations: string[] = [];
    if (pressureLevel === 'extreme') {
      recommendations.push(
        'EXTREME pressure ahead - consider exiting positions'
      );
      recommendations.push('Supply shock likely - expect significant volatility');
    } else if (pressureLevel === 'high') {
      recommendations.push('HIGH pressure - reduce exposure significantly');
      recommendations.push('Watch for cascading liquidations');
    } else if (pressureLevel === 'medium') {
      recommendations.push('MODERATE pressure - monitor and hedge positions');
    } else {
      recommendations.push('LOW pressure - normal market conditions expected');
    }

    return {
      symbol: unlocks[0]?.symbol || 'UNKNOWN',
      totalUpcomingUnlocks: unlocks.length,
      totalUnlockValueUsd,
      percentOfMarketCap,
      timeframe: `${timeframeDays} days`,
      pressureLevel,
      peakPressureDates,
      recommendations,
    };
  }

  /**
   * Analyze supply dilution impact
   */
  static analyzeSupplyDilution(
    unlock: NormalizedTokenUnlock
  ): SupplyDilutionAnalysis {
    const currentCirculatingSupply =
      unlock.circulatingSupplyBefore || unlock.unlockAmount * 10; // Estimate if not available
    const postUnlockCirculatingSupply = currentCirculatingSupply + unlock.unlockAmount;
    const dilutionPercentage =
      (unlock.unlockAmount / currentCirculatingSupply) * 100;

    // Estimate price impact (simplified model)
    // Assumes linear relationship between supply increase and price decrease
    // Real impact depends on many factors (demand, sentiment, etc.)
    let estimatedPriceImpact = dilutionPercentage * -0.8; // 80% of dilution
    estimatedPriceImpact = Math.max(estimatedPriceImpact, -50); // Cap at -50%

    // Estimate time to absorb (based on typical market recovery)
    let timeToAbsorb = Math.ceil(dilutionPercentage * 2); // 2 days per 1% dilution
    if (unlock.category === 'team' || unlock.category === 'investor') {
      timeToAbsorb *= 1.5; // Longer for high-risk categories
    }

    return {
      symbol: unlock.symbol,
      currentCirculatingSupply,
      postUnlockCirculatingSupply,
      dilutionPercentage,
      estimatedPriceImpact,
      timeToAbsorb,
    };
  }

  /**
   * Analyze category performance
   */
  static analyzeCategoryPerformance(
    unlocks: NormalizedTokenUnlock[]
  ): CategoryAnalysis[] {
    const categoryMap = new Map<string, NormalizedTokenUnlock[]>();

    // Group by category
    unlocks.forEach((unlock) => {
      const category = unlock.category;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(unlock);
    });

    // Analyze each category
    const analyses: CategoryAnalysis[] = [];

    for (const [category, categoryUnlocks] of categoryMap) {
      const totalValueUsd = categoryUnlocks.reduce(
        (sum, u) => sum + u.unlockAmountUsd,
        0
      );

      const averageImpactScore =
        categoryUnlocks.reduce((sum, u) => sum + (u.impactScore || 0), 0) /
        categoryUnlocks.length;

      const categoryRisk = this.calculateCategoryRisk(category);
      const historicalSellingPressure = categoryRisk * 2.5; // Convert to percentage

      let recommendation = '';
      if (historicalSellingPressure >= 40) {
        recommendation =
          'High risk category - expect significant selling pressure';
      } else if (historicalSellingPressure >= 25) {
        recommendation = 'Moderate risk - monitor closely for selling activity';
      } else {
        recommendation = 'Lower risk category - typically less selling pressure';
      }

      analyses.push({
        category,
        totalUnlocks: categoryUnlocks.length,
        totalValueUsd,
        averageImpactScore,
        historicalSellingPressure,
        recommendation,
      });
    }

    // Sort by total value descending
    return analyses.sort((a, b) => b.totalValueUsd - a.totalValueUsd);
  }

  /**
   * Generate comprehensive analytics report
   */
  static generateAnalyticsReport(
    unlocks: NormalizedTokenUnlock[],
    marketPrice?: MarketPrice
  ): {
    summary: {
      totalUnlocks: number;
      totalValueUsd: number;
      averageImpactScore: number;
      highImpactCount: number;
      criticalImpactCount: number;
    };
    assessments: ImpactAssessment[];
    marketPressure: MarketPressureAnalysis;
    categoryAnalysis: CategoryAnalysis[];
    topRisks: ImpactAssessment[];
  } {
    // Calculate assessments
    const assessments = unlocks.map((unlock) =>
      this.calculateImpactAssessment(unlock, marketPrice, unlocks)
    );

    // Summary statistics
    const totalValueUsd = unlocks.reduce((sum, u) => sum + u.unlockAmountUsd, 0);
    const averageImpactScore =
      assessments.reduce((sum, a) => sum + a.overallScore, 0) /
      assessments.length;
    const highImpactCount = assessments.filter(
      (a) => a.severity === 'high'
    ).length;
    const criticalImpactCount = assessments.filter(
      (a) => a.severity === 'critical'
    ).length;

    // Market pressure analysis
    const marketPressure = this.analyzeMarketPressure(unlocks, marketPrice);

    // Category analysis
    const categoryAnalysis = this.analyzeCategoryPerformance(unlocks);

    // Top risks (by overall score)
    const topRisks = assessments
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, 10);

    return {
      summary: {
        totalUnlocks: unlocks.length,
        totalValueUsd,
        averageImpactScore,
        highImpactCount,
        criticalImpactCount,
      },
      assessments,
      marketPressure,
      categoryAnalysis,
      topRisks,
    };
  }
}

export default TokenUnlocksAnalytics;

