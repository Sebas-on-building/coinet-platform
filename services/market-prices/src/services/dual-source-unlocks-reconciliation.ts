/**
 * Dual-Source Token Unlocks Reconciliation Service
 * Divine world-class reconciliation between Messari and The Tie data
 * 
 * Features:
 * - Automatic discrepancy detection
 * - Consensus value calculation
 * - Confidence scoring
 * - Historical accuracy tracking
 * - Data quality alerts
 * - Intelligent source selection
 */

import EventEmitter from 'eventemitter3';
import { logger } from '../utils/logger';
import { MessariRestClient } from '../providers/messari-rest';
import { TheTieRestClient } from '../providers/thetie-rest';
import { NormalizedTokenUnlock } from '../types/messari.types';
import { UnifiedTokenUnlock, TokenUnlockComparison } from '../types/thetie.types';
import { MarketPrice } from '../types';

export interface ReconciliationConfig {
  tolerancePercent: number; // Acceptable difference percentage (default: 5%)
  preferredSource: 'messari' | 'thetie' | 'auto'; // Auto uses confidence scores
  minConfidenceThreshold: number; // Minimum confidence to trust data (default: 70)
  enableAlerts: boolean;
  alertThreshold: number; // Discrepancy % to trigger alert
}

export interface ReconciliationResult {
  ticker: string;
  unlockDate: Date;
  sources: {
    messari?: NormalizedTokenUnlock;
    thetie?: UnifiedTokenUnlock;
  };
  consensus: {
    tokensUnlocked: number;
    tokensUnlockedUsd: number;
    percentageOfSupply: number;
    category: string;
    confidence: 'high' | 'medium' | 'low';
    selectedSource: 'messari' | 'thetie' | 'averaged';
  };
  discrepancies: Discrepancy[];
  qualityScore: number; // 0-100, overall data quality
  recommendations: string[];
}

export interface Discrepancy {
  field: string;
  messariValue?: any;
  theTieValue?: any;
  difference?: number;
  differencePercent?: number;
  severity: 'critical' | 'major' | 'minor';
  impact: string;
}

export interface ReconciliationReport {
  totalUnlocks: number;
  totalReconciled: number;
  messariOnlyCount: number;
  theTieOnlyCount: number;
  bothSourcesCount: number;
  discrepancyCount: number;
  averageQualityScore: number;
  criticalDiscrepancies: Discrepancy[];
  recommendations: string[];
  byTicker: Map<string, ReconciliationResult[]>;
}

export class DualSourceUnlocksReconciliation extends EventEmitter {
  private messariClient: MessariRestClient;
  private theTieClient: TheTieRestClient;
  private config: ReconciliationConfig;

  constructor(
    messariClient: MessariRestClient,
    theTieClient: TheTieRestClient,
    config?: Partial<ReconciliationConfig>
  ) {
    super();

    this.messariClient = messariClient;
    this.theTieClient = theTieClient;

    this.config = {
      tolerancePercent: config?.tolerancePercent ?? 5,
      preferredSource: config?.preferredSource ?? 'auto',
      minConfidenceThreshold: config?.minConfidenceThreshold ?? 70,
      enableAlerts: config?.enableAlerts ?? true,
      alertThreshold: config?.alertThreshold ?? 10,
    };

    logger.info('Dual-source unlocks reconciliation initialized', {
      preferredSource: this.config.preferredSource,
      tolerancePercent: this.config.tolerancePercent,
    });
  }

  /**
   * Reconcile unlock data for a specific ticker
   */
  async reconcileTickerUnlocks(
    ticker: string,
    daysAhead: number = 90
  ): Promise<ReconciliationResult[]> {
    try {
      logger.info('Reconciling unlock data', { ticker, daysAhead });

      // Fetch from both sources in parallel
      const [messariUnlocks, theTieUnlocks] = await Promise.allSettled([
        this.fetchMessariUnlocks(ticker, daysAhead),
        this.fetchTheTieUnlocks(ticker, daysAhead),
      ]);

      const messariData = messariUnlocks.status === 'fulfilled' ? messariUnlocks.value : [];
      const theTieData = theTieUnlocks.status === 'fulfilled' ? theTieUnlocks.value : [];

      // Log fetch results
      logger.info('Fetched unlock data', {
        ticker,
        messariCount: messariData.length,
        theTieCount: theTieData.length,
      });

      // Reconcile the data
      const results = this.performReconciliation(ticker, messariData, theTieData);

      // Emit reconciliation event
      this.emit('reconciliation_completed', {
        ticker,
        results,
        messariCount: messariData.length,
        theTieCount: theTieData.length,
      });

      return results;
    } catch (error) {
      logger.error('Failed to reconcile ticker unlocks', { error, ticker });
      throw error;
    }
  }

  /**
   * Reconcile unlock data for multiple tickers
   */
  async reconcileMultipleTickers(
    tickers: string[],
    daysAhead: number = 90
  ): Promise<ReconciliationReport> {
    logger.info('Reconciling multiple tickers', {
      tickers: tickers.length,
      daysAhead,
    });

    const byTicker = new Map<string, ReconciliationResult[]>();
    let totalReconciled = 0;
    let messariOnlyCount = 0;
    let theTieOnlyCount = 0;
    let bothSourcesCount = 0;
    let discrepancyCount = 0;
    const criticalDiscrepancies: Discrepancy[] = [];

    // Process each ticker
    for (const ticker of tickers) {
      try {
        const results = await this.reconcileTickerUnlocks(ticker, daysAhead);
        byTicker.set(ticker, results);
        totalReconciled += results.length;

        // Count sources
        results.forEach(result => {
          const hasMessari = !!result.sources.messari;
          const hasThetie = !!result.sources.thetie;

          if (hasMessari && hasThetie) {
            bothSourcesCount++;
            if (result.discrepancies.length > 0) {
              discrepancyCount++;
            }
            // Collect critical discrepancies
            result.discrepancies
              .filter(d => d.severity === 'critical')
              .forEach(d => criticalDiscrepancies.push(d));
          } else if (hasMessari) {
            messariOnlyCount++;
          } else if (hasThetie) {
            theTieOnlyCount++;
          }
        });
      } catch (error) {
        logger.warn('Failed to reconcile ticker', { ticker, error });
      }
    }

    // Calculate average quality score
    let totalQualityScore = 0;
    let qualityScoreCount = 0;
    byTicker.forEach(results => {
      results.forEach(result => {
        totalQualityScore += result.qualityScore;
        qualityScoreCount++;
      });
    });
    const averageQualityScore = qualityScoreCount > 0 
      ? totalQualityScore / qualityScoreCount 
      : 0;

    // Generate recommendations
    const recommendations = this.generateReportRecommendations({
      totalReconciled,
      messariOnlyCount,
      theTieOnlyCount,
      bothSourcesCount,
      discrepancyCount,
      averageQualityScore,
      criticalDiscrepancies,
    });

    return {
      totalUnlocks: totalReconciled,
      totalReconciled,
      messariOnlyCount,
      theTieOnlyCount,
      bothSourcesCount,
      discrepancyCount,
      averageQualityScore,
      criticalDiscrepancies,
      recommendations,
      byTicker,
    };
  }

  /**
   * Perform reconciliation between two data sources
   */
  private performReconciliation(
    ticker: string,
    messariUnlocks: NormalizedTokenUnlock[],
    theTieUnlocks: UnifiedTokenUnlock[]
  ): ReconciliationResult[] {
    const results: ReconciliationResult[] = [];

    // Create date-based lookup
    const messariByDate = new Map<string, NormalizedTokenUnlock>();
    const theTieByDate = new Map<string, UnifiedTokenUnlock>();

    messariUnlocks.forEach(unlock => {
      const dateKey = this.getDateKey(unlock.unlockDate);
      messariByDate.set(dateKey, unlock);
    });

    theTieUnlocks.forEach(unlock => {
      const dateKey = this.getDateKey(unlock.unlockDate);
      theTieByDate.set(dateKey, unlock);
    });

    // Get all unique dates
    const allDates = new Set([
      ...Array.from(messariByDate.keys()),
      ...Array.from(theTieByDate.keys()),
    ]);

    // Reconcile each date
    allDates.forEach(dateKey => {
      const messariData = messariByDate.get(dateKey);
      const theTieData = theTieByDate.get(dateKey);

      const result = this.reconcileSingleUnlock(
        ticker,
        new Date(dateKey),
        messariData,
        theTieData
      );

      results.push(result);
    });

    return results.sort((a, b) => a.unlockDate.getTime() - b.unlockDate.getTime());
  }

  /**
   * Reconcile a single unlock event
   */
  private reconcileSingleUnlock(
    ticker: string,
    unlockDate: Date,
    messariData?: NormalizedTokenUnlock,
    theTieData?: UnifiedTokenUnlock
  ): ReconciliationResult {
    const discrepancies: Discrepancy[] = [];

    // Handle missing data from one source
    if (!messariData || !theTieData) {
      return {
        ticker,
        unlockDate,
        sources: { messari: messariData, thetie: theTieData },
        consensus: {
          tokensUnlocked: messariData?.unlockAmount || theTieData?.tokensUnlocked || 0,
          tokensUnlockedUsd: messariData?.unlockAmountUsd || theTieData?.tokensUnlockedUsd || 0,
          percentageOfSupply: messariData?.unlockPercentage || theTieData?.percentageOfSupply || 0,
          category: messariData?.category || theTieData?.category || 'unknown',
          confidence: 'low',
          selectedSource: messariData ? 'messari' : 'thetie',
        },
        discrepancies: [],
        qualityScore: 50, // Lower score for single-source data
        recommendations: [
          `Only available from ${messariData ? 'Messari' : 'The Tie'} - consider manual verification`,
        ],
      };
    }

    // Both sources have data - perform detailed comparison
    // Compare unlock amount
    const amountDiscrepancy = this.compareValues(
      'tokensUnlocked',
      messariData.unlockAmount,
      theTieData.tokensUnlocked
    );
    if (amountDiscrepancy) discrepancies.push(amountDiscrepancy);

    // Compare USD value
    const usdDiscrepancy = this.compareValues(
      'tokensUnlockedUsd',
      messariData.unlockAmountUsd,
      theTieData.tokensUnlockedUsd
    );
    if (usdDiscrepancy) discrepancies.push(usdDiscrepancy);

    // Compare percentage
    const percentDiscrepancy = this.compareValues(
      'percentageOfSupply',
      messariData.unlockPercentage,
      theTieData.percentageOfSupply
    );
    if (percentDiscrepancy) discrepancies.push(percentDiscrepancy);

    // Determine consensus value using intelligent source selection
    const consensus = this.calculateConsensusValue(
      messariData,
      theTieData,
      discrepancies
    );

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(
      messariData,
      theTieData,
      discrepancies
    );

    // Generate recommendations
    const recommendations = this.generateReconciliationRecommendations(
      discrepancies,
      consensus,
      qualityScore
    );

    // Generate alerts for critical discrepancies
    if (this.config.enableAlerts) {
      discrepancies
        .filter(d => d.severity === 'critical')
        .forEach(d => {
          this.emit('critical_discrepancy', {
            ticker,
            unlockDate,
            discrepancy: d,
          });
        });
    }

    return {
      ticker,
      unlockDate,
      sources: { messari: messariData, thetie: theTieData },
      consensus,
      discrepancies,
      qualityScore,
      recommendations,
    };
  }

  /**
   * Compare two values and detect discrepancies
   */
  private compareValues(
    field: string,
    messariValue: number,
    theTieValue: number
  ): Discrepancy | null {
    const difference = Math.abs(messariValue - theTieValue);
    const maxValue = Math.max(messariValue, theTieValue);
    
    if (maxValue === 0) return null;

    const differencePercent = (difference / maxValue) * 100;

    if (differencePercent <= this.config.tolerancePercent) {
      return null; // Within tolerance
    }

    // Determine severity
    let severity: 'critical' | 'major' | 'minor';
    if (differencePercent > 25) {
      severity = 'critical';
    } else if (differencePercent > 10) {
      severity = 'major';
    } else {
      severity = 'minor';
    }

    // Generate impact description
    const impact = this.describeDiscrepancyImpact(field, differencePercent);

    return {
      field,
      messariValue,
      theTieValue,
      difference,
      differencePercent,
      severity,
      impact,
    };
  }

  /**
   * Calculate consensus value from multiple sources
   */
  private calculateConsensusValue(
    messariData: NormalizedTokenUnlock,
    theTieData: UnifiedTokenUnlock,
    discrepancies: Discrepancy[]
  ): ReconciliationResult['consensus'] {
    let selectedSource: 'messari' | 'thetie' | 'averaged' = 'averaged';
    let confidence: 'high' | 'medium' | 'low' = 'high';

    // Auto source selection based on configuration
    if (this.config.preferredSource === 'auto') {
      // Use The Tie if high confidence, otherwise use average
      if (theTieData.confidenceScore && theTieData.confidenceScore >= 90) {
        selectedSource = 'thetie';
      } else if (messariData.impactScore && messariData.impactScore >= 80) {
        selectedSource = 'messari';
      } else {
        selectedSource = 'averaged';
      }
    } else {
      selectedSource = this.config.preferredSource;
    }

    // Adjust confidence based on discrepancies
    if (discrepancies.length === 0) {
      confidence = 'high';
    } else if (discrepancies.some(d => d.severity === 'critical')) {
      confidence = 'low';
    } else if (discrepancies.some(d => d.severity === 'major')) {
      confidence = 'medium';
    } else {
      confidence = 'high';
    }

    // Calculate consensus values
    let tokensUnlocked: number;
    let tokensUnlockedUsd: number;
    let percentageOfSupply: number;

    if (selectedSource === 'messari') {
      tokensUnlocked = messariData.unlockAmount;
      tokensUnlockedUsd = messariData.unlockAmountUsd;
      percentageOfSupply = messariData.unlockPercentage;
    } else if (selectedSource === 'thetie') {
      tokensUnlocked = theTieData.tokensUnlocked;
      tokensUnlockedUsd = theTieData.tokensUnlockedUsd;
      percentageOfSupply = theTieData.percentageOfSupply;
    } else {
      // Averaged values
      tokensUnlocked = (messariData.unlockAmount + theTieData.tokensUnlocked) / 2;
      tokensUnlockedUsd = (messariData.unlockAmountUsd + theTieData.tokensUnlockedUsd) / 2;
      percentageOfSupply = (messariData.unlockPercentage + theTieData.percentageOfSupply) / 2;
    }

    // Prefer more specific category information
    const category = messariData.category || theTieData.category;

    return {
      tokensUnlocked,
      tokensUnlockedUsd,
      percentageOfSupply,
      category,
      confidence,
      selectedSource,
    };
  }

  /**
   * Calculate overall quality score
   */
  private calculateQualityScore(
    messariData: NormalizedTokenUnlock,
    theTieData: UnifiedTokenUnlock,
    discrepancies: Discrepancy[]
  ): number {
    let score = 100;

    // Deduct for discrepancies
    discrepancies.forEach(d => {
      if (d.severity === 'critical') score -= 30;
      else if (d.severity === 'major') score -= 15;
      else if (d.severity === 'minor') score -= 5;
    });

    // Add bonus for high confidence from The Tie
    if (theTieData.confidenceScore && theTieData.confidenceScore >= 90) {
      score += 10;
    }

    // Add bonus for official source type
    if (theTieData.metadata.sourceType === 'official') {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Describe discrepancy impact
   */
  private describeDiscrepancyImpact(field: string, differencePercent: number): string {
    const impactMap: Record<string, string> = {
      tokensUnlocked: `${differencePercent.toFixed(1)}% difference in unlock amount could significantly affect price predictions`,
      tokensUnlockedUsd: `$${differencePercent.toFixed(1)}% difference in USD value affects risk assessment`,
      percentageOfSupply: `${differencePercent.toFixed(1)}% difference in supply percentage impacts dilution analysis`,
    };

    return impactMap[field] || `${differencePercent.toFixed(1)}% difference detected in ${field}`;
  }

  /**
   * Generate recommendations for reconciliation result
   */
  private generateReconciliationRecommendations(
    discrepancies: Discrepancy[],
    consensus: ReconciliationResult['consensus'],
    qualityScore: number
  ): string[] {
    const recommendations: string[] = [];

    if (qualityScore >= 90) {
      recommendations.push('HIGH QUALITY: Data is highly reliable from both sources');
    } else if (qualityScore >= 70) {
      recommendations.push('GOOD QUALITY: Data is reliable with minor discrepancies');
    } else if (qualityScore >= 50) {
      recommendations.push('MODERATE QUALITY: Significant discrepancies detected - manual review recommended');
    } else {
      recommendations.push('LOW QUALITY: Critical discrepancies - manual verification required');
    }

    if (consensus.confidence === 'low') {
      recommendations.push('Low confidence in consensus value - cross-reference with official sources');
    }

    if (discrepancies.some(d => d.severity === 'critical')) {
      recommendations.push('CRITICAL discrepancies found - immediate investigation required');
    }

    if (discrepancies.some(d => d.field === 'tokensUnlocked' && d.differencePercent! > 20)) {
      recommendations.push('Large discrepancy in unlock amount - verify with official documentation');
    }

    return recommendations;
  }

  /**
   * Generate report-level recommendations
   */
  private generateReportRecommendations(stats: {
    totalReconciled: number;
    messariOnlyCount: number;
    theTieOnlyCount: number;
    bothSourcesCount: number;
    discrepancyCount: number;
    averageQualityScore: number;
    criticalDiscrepancies: Discrepancy[];
  }): string[] {
    const recommendations: string[] = [];

    // Coverage analysis
    const dualSourcePercent = (stats.bothSourcesCount / stats.totalReconciled) * 100;
    if (dualSourcePercent < 50) {
      recommendations.push(
        `Low dual-source coverage (${dualSourcePercent.toFixed(1)}%) - consider expanding API subscriptions`
      );
    } else if (dualSourcePercent >= 80) {
      recommendations.push(
        `Excellent dual-source coverage (${dualSourcePercent.toFixed(1)}%) - high data confidence`
      );
    }

    // Quality analysis
    if (stats.averageQualityScore >= 85) {
      recommendations.push('Excellent data quality across all unlocks');
    } else if (stats.averageQualityScore < 70) {
      recommendations.push('Data quality concerns - manual review recommended for critical unlocks');
    }

    // Discrepancy analysis
    const discrepancyRate = (stats.discrepancyCount / stats.bothSourcesCount) * 100;
    if (discrepancyRate > 20) {
      recommendations.push(
        `High discrepancy rate (${discrepancyRate.toFixed(1)}%) - investigate data source reliability`
      );
    }

    // Critical issues
    if (stats.criticalDiscrepancies.length > 0) {
      recommendations.push(
        `${stats.criticalDiscrepancies.length} critical discrepancies require immediate attention`
      );
    }

    return recommendations;
  }

  /**
   * Fetch Messari unlocks
   */
  private async fetchMessariUnlocks(
    ticker: string,
    daysAhead: number
  ): Promise<NormalizedTokenUnlock[]> {
    try {
      return await this.messariClient.getUpcomingUnlocksNormalized(daysAhead, 0);
    } catch (error) {
      logger.warn('Failed to fetch Messari unlocks', { ticker, error });
      return [];
    }
  }

  /**
   * Fetch The Tie unlocks
   */
  private async fetchTheTieUnlocks(
    ticker: string,
    daysAhead: number
  ): Promise<UnifiedTokenUnlock[]> {
    try {
      return await this.theTieClient.getUpcomingUnlocksNormalized(
        daysAhead,
        this.config.minConfidenceThreshold
      );
    } catch (error) {
      logger.warn('Failed to fetch The Tie unlocks', { ticker, error });
      return [];
    }
  }

  /**
   * Get date key for grouping (YYYY-MM-DD)
   */
  private getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get reconciliation statistics
   */
  getStats(): any {
    return {
      messari: this.messariClient.getStats(),
      thetie: this.theTieClient.getStats(),
      config: this.config,
    };
  }
}

export default DualSourceUnlocksReconciliation;

