/**
 * Enhanced Consensus Engine with ML-Based Anomaly Detection
 * 
 * Extends the base consensus engine with:
 * - Isolation Forest for detecting discrepancies
 * - Dynamic source reliability updates
 * - Automated outlier handling
 * - 99% agreement target across 10+ sources
 */

import { EventEmitter } from 'events';
import { logger } from '../../utils/logger';
import { IsolationForest, DataPoint, AnomalyResult, createIsolationForest } from './isolation-forest';

// Re-export types from base consensus engine
export type UnlockDataSource = 
  | 'messari'
  | 'thetie'
  | 'cryptorank'
  | 'tokenunlocks'
  | 'defillama'
  | 'onchain'
  | 'coingecko'
  | 'coinmarketcap'
  | 'manual'
  | 'api';

export interface SourceUnlock {
  source: UnlockDataSource;
  symbol: string;
  name: string;
  unlockDate: Date;
  unlockAmount: number;
  unlockAmountUsd: number;
  percentOfSupply: number;
  percentOfCirculating: number;
  category: string;
  confidence: number;
  verified: boolean;
  lastUpdated: Date;
  rawData?: any;
}

export interface AnomalyInfo {
  sourceId: string;
  score: number;
  isAnomaly: boolean;
  explanation: string;
  suggestedAction: 'exclude' | 'flag' | 'include';
}

export interface EnhancedConsensusResult {
  id: string;
  symbol: string;
  name: string;
  unlockDate: Date;
  
  // Consensus values
  consensusAmount: number;
  consensusAmountUsd: number;
  consensusPercentOfSupply: number;
  consensusCategory: string;
  
  // Quality metrics
  overallConfidence: number;
  sourceAgreement: number;
  anomalyFreeAgreement: number;  // Agreement after excluding anomalies
  dataFreshness: number;
  onChainVerified: boolean;
  
  // Source analysis
  sources: {
    source: UnlockDataSource;
    amount: number;
    deviation: number;
    isAnomaly: boolean;
    anomalyScore: number;
    reliability: number;
  }[];
  
  // Anomaly detection
  anomalies: AnomalyInfo[];
  hasSignificantAnomalies: boolean;
  
  // ML metrics
  isolationForestScore: number;
  consensusMethod: 'weighted' | 'robust' | 'ml-filtered';
  
  computedAt: Date;
}

// Dynamic source reliability
interface SourceReliability {
  source: UnlockDataSource;
  baseWeight: number;
  recentAccuracy: number;
  anomalyRate: number;
  effectiveWeight: number;
  sampleCount: number;
}

// Engine configuration
export interface EnhancedConsensusConfig {
  isolationForestTrees: number;
  anomalyThreshold: number;
  minSourcesForConsensus: number;
  maxAnomalyRate: number;
  reliabilityUpdateRate: number;
  useRobustEstimators: boolean;
}

const DEFAULT_CONFIG: EnhancedConsensusConfig = {
  isolationForestTrees: 100,
  anomalyThreshold: 0.7,
  minSourcesForConsensus: 3,
  maxAnomalyRate: 0.3,
  reliabilityUpdateRate: 0.1,
  useRobustEstimators: true,
};

// Base weights
const BASE_WEIGHTS: Record<UnlockDataSource, number> = {
  onchain: 1.0,
  messari: 0.85,
  thetie: 0.80,
  tokenunlocks: 0.75,
  cryptorank: 0.70,
  defillama: 0.65,
  coingecko: 0.60,
  coinmarketcap: 0.55,
  manual: 0.50,
  api: 0.45,
};

export class EnhancedConsensusEngine extends EventEmitter {
  private config: EnhancedConsensusConfig;
  private isolationForest: IsolationForest;
  private sourceData: Map<string, Map<UnlockDataSource, SourceUnlock>>;
  private sourceReliability: Map<UnlockDataSource, SourceReliability>;
  private historicalData: DataPoint[] = [];
  private isForestTrained: boolean = false;

  constructor(config: Partial<EnhancedConsensusConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sourceData = new Map();
    this.sourceReliability = new Map();
    
    // Initialize isolation forest
    this.isolationForest = createIsolationForest({
      numTrees: this.config.isolationForestTrees,
      contamination: this.config.maxAnomalyRate,
    });

    // Initialize source reliability
    this.initializeReliability();

    logger.info('Enhanced Consensus Engine initialized', {
      config: this.config,
    });
  }

  /**
   * Initialize source reliability tracking
   */
  private initializeReliability(): void {
    Object.entries(BASE_WEIGHTS).forEach(([source, weight]) => {
      this.sourceReliability.set(source as UnlockDataSource, {
        source: source as UnlockDataSource,
        baseWeight: weight,
        recentAccuracy: 1.0,
        anomalyRate: 0,
        effectiveWeight: weight,
        sampleCount: 0,
      });
    });
  }

  /**
   * Add source data
   */
  addSourceData(unlock: SourceUnlock): void {
    const key = this.getUnlockKey(unlock.symbol, unlock.unlockDate);
    
    if (!this.sourceData.has(key)) {
      this.sourceData.set(key, new Map());
    }
    
    this.sourceData.get(key)!.set(unlock.source, unlock);

    // Add to historical data for anomaly detection training
    const dataPoint = this.unlockToDataPoint(unlock, key);
    this.historicalData.push(dataPoint);

    // Retrain isolation forest if enough new data
    if (this.historicalData.length % 100 === 0 && this.historicalData.length >= 50) {
      this.trainIsolationForest();
    }
  }

  /**
   * Add batch of source data
   */
  addSourceDataBatch(unlocks: SourceUnlock[]): void {
    unlocks.forEach(unlock => this.addSourceData(unlock));
  }

  /**
   * Convert unlock to data point for anomaly detection
   */
  private unlockToDataPoint(unlock: SourceUnlock, key: string): DataPoint {
    return {
      id: `${key}:${unlock.source}`,
      features: [
        unlock.unlockAmount,
        unlock.unlockAmountUsd,
        unlock.percentOfSupply,
        unlock.percentOfCirculating,
        this.categoryToNumber(unlock.category),
        unlock.confidence,
        unlock.verified ? 1 : 0,
        BASE_WEIGHTS[unlock.source] || 0.5,
      ],
      metadata: { unlock, key },
    };
  }

  /**
   * Convert category to number
   */
  private categoryToNumber(category: string): number {
    const mapping: Record<string, number> = {
      team: 1,
      investor: 2,
      advisor: 3,
      treasury: 4,
      community: 5,
      other: 6,
    };
    return mapping[category.toLowerCase()] || 6;
  }

  /**
   * Train the isolation forest on historical data
   */
  trainIsolationForest(): void {
    if (this.historicalData.length < 50) {
      logger.debug('Not enough data for isolation forest training', {
        current: this.historicalData.length,
        required: 50,
      });
      return;
    }

    this.isolationForest.train(this.historicalData);
    this.isForestTrained = true;

    logger.info('Isolation Forest trained', {
      dataPoints: this.historicalData.length,
      stats: this.isolationForest.getStats(),
    });

    this.emit('forestTrained', this.isolationForest.getStats());
  }

  /**
   * Compute enhanced consensus with ML anomaly detection
   */
  computeConsensus(symbol: string, unlockDate: Date): EnhancedConsensusResult | null {
    const key = this.getUnlockKey(symbol, unlockDate);
    const sources = this.sourceData.get(key);

    if (!sources || sources.size < this.config.minSourcesForConsensus) {
      return null;
    }

    const sourceArray = Array.from(sources.values());

    // Step 1: Detect anomalies in source data
    const anomalyResults = this.detectAnomalies(sourceArray, key);
    
    // Step 2: Separate normal and anomalous sources
    const normalSources = sourceArray.filter((_, i) => !anomalyResults[i].isAnomaly);
    const anomalies = sourceArray
      .map((s, i) => ({ source: s, result: anomalyResults[i] }))
      .filter(({ result }) => result.isAnomaly);

    // Step 3: Compute consensus using appropriate method
    let consensus: { amount: number; amountUsd: number; percentOfSupply: number; category: string };
    let consensusMethod: 'weighted' | 'robust' | 'ml-filtered';

    if (normalSources.length >= this.config.minSourcesForConsensus) {
      // Use ML-filtered consensus (preferred)
      consensus = this.computeWeightedConsensus(normalSources);
      consensusMethod = 'ml-filtered';
    } else if (this.config.useRobustEstimators) {
      // Fall back to robust estimators on all data
      consensus = this.computeRobustConsensus(sourceArray);
      consensusMethod = 'robust';
    } else {
      // Standard weighted consensus
      consensus = this.computeWeightedConsensus(sourceArray);
      consensusMethod = 'weighted';
    }

    // Step 4: Calculate quality metrics
    const sourceAgreement = this.calculateAgreement(sourceArray, consensus.amount);
    const anomalyFreeAgreement = normalSources.length > 0
      ? this.calculateAgreement(normalSources, consensus.amount)
      : 0;

    // Step 5: Update source reliability based on deviations
    this.updateSourceReliability(sourceArray, consensus.amount);

    // Step 6: Build result
    const result: EnhancedConsensusResult = {
      id: key,
      symbol,
      name: sourceArray[0].name,
      unlockDate,

      consensusAmount: consensus.amount,
      consensusAmountUsd: consensus.amountUsd,
      consensusPercentOfSupply: consensus.percentOfSupply,
      consensusCategory: consensus.category,

      overallConfidence: this.calculateOverallConfidence(
        sourceArray,
        anomalyResults,
        consensusMethod
      ),
      sourceAgreement,
      anomalyFreeAgreement,
      dataFreshness: this.calculateFreshness(sourceArray),
      onChainVerified: sourceArray.some(s => s.source === 'onchain' && s.verified),

      sources: sourceArray.map((s, i) => ({
        source: s.source,
        amount: s.unlockAmount,
        deviation: (s.unlockAmount - consensus.amount) / consensus.amount,
        isAnomaly: anomalyResults[i].isAnomaly,
        anomalyScore: anomalyResults[i].score,
        reliability: this.getSourceReliability(s.source),
      })),

      anomalies: anomalies.map(({ source, result }) => ({
        sourceId: source.source,
        score: result.score,
        isAnomaly: true,
        explanation: this.generateAnomalyExplanation(source, result, consensus.amount),
        suggestedAction: result.score > 0.9 ? 'exclude' : 'flag',
      })),

      hasSignificantAnomalies: anomalies.some(a => a.result.score > 0.8),
      isolationForestScore: this.calculateAverageAnomalyScore(anomalyResults),
      consensusMethod,

      computedAt: new Date(),
    };

    // Emit events
    if (result.hasSignificantAnomalies) {
      this.emit('significantAnomaly', result);
    }

    if (result.anomalyFreeAgreement >= 0.99) {
      this.emit('highAgreement', result);
    }

    return result;
  }

  /**
   * Detect anomalies in source data
   */
  private detectAnomalies(sources: SourceUnlock[], key: string): AnomalyResult[] {
    if (!this.isForestTrained) {
      // If not trained, use statistical outlier detection
      return sources.map(source => this.statisticalOutlierDetection(source, sources));
    }

    return sources.map(source => {
      const dataPoint = this.unlockToDataPoint(source, key);
      return this.isolationForest.detect(dataPoint);
    });
  }

  /**
   * Statistical outlier detection fallback
   */
  private statisticalOutlierDetection(
    source: SourceUnlock,
    allSources: SourceUnlock[]
  ): AnomalyResult {
    // Calculate mean and std
    const amounts = allSources.map(s => s.unlockAmount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const std = Math.sqrt(
      amounts.reduce((sum, a) => sum + (a - mean) ** 2, 0) / amounts.length
    ) || 1;

    const zScore = Math.abs((source.unlockAmount - mean) / std);
    const score = Math.min(zScore / 3, 1); // Normalize to 0-1

    return {
      id: source.source,
      score,
      isAnomaly: zScore > 2.5,
      confidence: 0.7,
      pathLength: 0,
      explanation: {
        mostAnomalousFeatures: [{ index: 0, contribution: zScore }],
        comparisonToNormal: zScore,
      },
    };
  }

  /**
   * Compute weighted consensus
   */
  private computeWeightedConsensus(sources: SourceUnlock[]): {
    amount: number;
    amountUsd: number;
    percentOfSupply: number;
    category: string;
  } {
    let totalWeight = 0;
    let weightedAmount = 0;
    let weightedAmountUsd = 0;
    let weightedPercent = 0;
    const categoryVotes: Map<string, number> = new Map();

    sources.forEach(source => {
      const reliability = this.getSourceReliability(source.source);
      const weight = reliability * source.confidence;
      
      totalWeight += weight;
      weightedAmount += source.unlockAmount * weight;
      weightedAmountUsd += source.unlockAmountUsd * weight;
      weightedPercent += source.percentOfSupply * weight;

      const currentVotes = categoryVotes.get(source.category) || 0;
      categoryVotes.set(source.category, currentVotes + weight);
    });

    // Find winning category
    let winningCategory = 'unknown';
    let maxVotes = 0;
    categoryVotes.forEach((votes, category) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        winningCategory = category;
      }
    });

    return {
      amount: totalWeight > 0 ? weightedAmount / totalWeight : 0,
      amountUsd: totalWeight > 0 ? weightedAmountUsd / totalWeight : 0,
      percentOfSupply: totalWeight > 0 ? weightedPercent / totalWeight : 0,
      category: winningCategory,
    };
  }

  /**
   * Compute robust consensus using median-based estimators
   */
  private computeRobustConsensus(sources: SourceUnlock[]): {
    amount: number;
    amountUsd: number;
    percentOfSupply: number;
    category: string;
  } {
    // Use median instead of mean (robust to outliers)
    const amounts = sources.map(s => s.unlockAmount).sort((a, b) => a - b);
    const amountsUsd = sources.map(s => s.unlockAmountUsd).sort((a, b) => a - b);
    const percents = sources.map(s => s.percentOfSupply).sort((a, b) => a - b);

    const median = (arr: number[]) => {
      const mid = Math.floor(arr.length / 2);
      return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
    };

    // Mode for category
    const categoryVotes: Map<string, number> = new Map();
    sources.forEach(s => {
      categoryVotes.set(s.category, (categoryVotes.get(s.category) || 0) + 1);
    });
    let winningCategory = 'unknown';
    let maxVotes = 0;
    categoryVotes.forEach((votes, category) => {
      if (votes > maxVotes) {
        maxVotes = votes;
        winningCategory = category;
      }
    });

    return {
      amount: median(amounts),
      amountUsd: median(amountsUsd),
      percentOfSupply: median(percents),
      category: winningCategory,
    };
  }

  /**
   * Calculate agreement percentage
   */
  private calculateAgreement(sources: SourceUnlock[], consensusAmount: number): number {
    if (sources.length === 0 || consensusAmount === 0) return 0;

    const threshold = 0.1; // 10% deviation allowed
    const agreeing = sources.filter(s => {
      const deviation = Math.abs(s.unlockAmount - consensusAmount) / consensusAmount;
      return deviation <= threshold;
    });

    return agreeing.length / sources.length;
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(
    sources: SourceUnlock[],
    anomalyResults: AnomalyResult[],
    method: string
  ): number {
    // Base confidence from source quality
    let confidence = sources.reduce((sum, s) => sum + s.confidence, 0) / sources.length;

    // Reduce for anomalies
    const anomalyPenalty = anomalyResults.filter(a => a.isAnomaly).length / sources.length;
    confidence *= (1 - anomalyPenalty * 0.3);

    // Bonus for ML-filtered method
    if (method === 'ml-filtered') {
      confidence *= 1.1;
    }

    return Math.min(confidence, 1);
  }

  /**
   * Calculate data freshness
   */
  private calculateFreshness(sources: SourceUnlock[]): number {
    const now = Date.now();
    const freshnesses = sources.map(s => {
      const age = (now - s.lastUpdated.getTime()) / (1000 * 60 * 60); // hours
      return Math.exp(-age / 24); // Decay over 24 hours
    });
    return freshnesses.reduce((a, b) => a + b, 0) / freshnesses.length;
  }

  /**
   * Get source reliability
   */
  private getSourceReliability(source: UnlockDataSource): number {
    return this.sourceReliability.get(source)?.effectiveWeight || BASE_WEIGHTS[source] || 0.5;
  }

  /**
   * Update source reliability based on actual vs consensus
   */
  private updateSourceReliability(sources: SourceUnlock[], consensusAmount: number): void {
    sources.forEach(source => {
      const reliability = this.sourceReliability.get(source.source);
      if (!reliability) return;

      // Calculate accuracy for this prediction
      const accuracy = 1 - Math.min(
        Math.abs(source.unlockAmount - consensusAmount) / consensusAmount,
        1
      );

      // Exponential moving average update
      const alpha = this.config.reliabilityUpdateRate;
      reliability.recentAccuracy = alpha * accuracy + (1 - alpha) * reliability.recentAccuracy;
      reliability.sampleCount++;

      // Update effective weight
      reliability.effectiveWeight = reliability.baseWeight * reliability.recentAccuracy;

      this.sourceReliability.set(source.source, reliability);
    });
  }

  /**
   * Generate anomaly explanation
   */
  private generateAnomalyExplanation(
    source: SourceUnlock,
    result: AnomalyResult,
    consensusAmount: number
  ): string {
    const deviation = ((source.unlockAmount - consensusAmount) / consensusAmount * 100).toFixed(1);
    const direction = source.unlockAmount > consensusAmount ? 'higher' : 'lower';

    return `${source.source} reports ${Math.abs(parseFloat(deviation))}% ${direction} than consensus ` +
           `(anomaly score: ${(result.score * 100).toFixed(0)}%)`;
  }

  /**
   * Calculate average anomaly score
   */
  private calculateAverageAnomalyScore(results: AnomalyResult[]): number {
    if (results.length === 0) return 0;
    return results.reduce((sum, r) => sum + r.score, 0) / results.length;
  }

  /**
   * Get unlock key
   */
  private getUnlockKey(symbol: string, date: Date): string {
    return `${symbol.toUpperCase()}-${date.toISOString().split('T')[0]}`;
  }

  /**
   * Get all source reliability stats
   */
  getSourceReliabilityStats(): Map<UnlockDataSource, SourceReliability> {
    return new Map(this.sourceReliability);
  }

  /**
   * Get isolation forest stats
   */
  getIsolationForestStats() {
    return this.isolationForest.getStats();
  }

  /**
   * Get engine statistics
   */
  getStats(): {
    totalUnlocks: number;
    historicalDataPoints: number;
    isForestTrained: boolean;
    avgAgreement: number;
  } {
    let totalAgreement = 0;
    let count = 0;

    this.sourceData.forEach((sources, key) => {
      const [symbol, dateStr] = key.split('-');
      const result = this.computeConsensus(symbol, new Date(dateStr));
      if (result) {
        totalAgreement += result.sourceAgreement;
        count++;
      }
    });

    return {
      totalUnlocks: this.sourceData.size,
      historicalDataPoints: this.historicalData.length,
      isForestTrained: this.isForestTrained,
      avgAgreement: count > 0 ? totalAgreement / count : 0,
    };
  }
}

// Singleton
let instance: EnhancedConsensusEngine | null = null;

export function getEnhancedConsensusEngine(): EnhancedConsensusEngine {
  if (!instance) {
    instance = new EnhancedConsensusEngine();
  }
  return instance;
}

export function resetEnhancedConsensusEngine(): void {
  instance = null;
}

export default EnhancedConsensusEngine;

